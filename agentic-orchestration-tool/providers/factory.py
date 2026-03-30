from __future__ import annotations

import importlib
import inspect
import pkgutil
from typing import Any, Type

from providers.base import Provider, ProviderConfig


def _default_provider_type_for_class_name(class_name: str) -> str:
    normalized = class_name.lower()
    if normalized.endswith("provider"):
        normalized = normalized[: -len("provider")]
    return normalized


def _discover_builtin_provider_types() -> dict[str, str]:
    discovered: dict[str, str] = {}
    providers_package = importlib.import_module("providers")

    for module_info in pkgutil.iter_modules(providers_package.__path__):
        if module_info.name in {"base", "factory"}:
            continue

        module_name = f"providers.{module_info.name}"
        module = importlib.import_module(module_name)

        for _, obj in inspect.getmembers(module, inspect.isclass):
            if obj is Provider or not issubclass(obj, Provider):
                continue
            if inspect.isabstract(obj):
                continue
            if obj.__module__ != module_name:
                continue

            provider_type = getattr(obj, "PROVIDER_TYPE", None)
            if not provider_type:
                provider_type = _default_provider_type_for_class_name(obj.__name__)
            provider_type = str(provider_type).strip().lower()

            dotted_path = f"{module_name}.{obj.__name__}"
            if provider_type in discovered and discovered[provider_type] != dotted_path:
                raise ValueError(
                    f"Duplicate built-in provider type '{provider_type}' found for "
                    f"'{discovered[provider_type]}' and '{dotted_path}'."
                )
            discovered[provider_type] = dotted_path

    return discovered


# Auto-discovered built-in `type` values mapped to "module.ClassName".
BUILTIN_PROVIDER_TYPES: dict[str, str] = _discover_builtin_provider_types()


def _import_provider_class(dotted_path: str, provider_id: str) -> Type[Provider]:
    module_name, _, class_name = dotted_path.rpartition(".")
    if not module_name or not class_name:
        raise ValueError(
            f"Provider '{provider_id}' has invalid class path "
            f"'{dotted_path}'. Use 'module.ClassName'."
        )

    try:
        module = importlib.import_module(module_name)
        provider_class = getattr(module, class_name)
    except Exception as exc:  # noqa: BLE001
        raise ValueError(
            f"Provider '{provider_id}' failed to load '{dotted_path}'."
        ) from exc

    if not isinstance(provider_class, type) or not issubclass(provider_class, Provider):
        raise ValueError(
            f"Class '{dotted_path}' for provider '{provider_id}' must inherit from Provider."
        )
    return provider_class


def _load_provider_class(config: ProviderConfig) -> Type[Provider]:
    if config.provider_class:
        return _import_provider_class(config.provider_class, config.id)

    dotted = BUILTIN_PROVIDER_TYPES.get(config.provider_type)
    if dotted is None:
        supported = ", ".join(sorted(BUILTIN_PROVIDER_TYPES))
        raise ValueError(
            f"Provider '{config.id}' has unsupported type '{config.provider_type}'. "
            f"Use one of [{supported}] or provide 'provider_class'."
        )
    return _import_provider_class(dotted, config.id)


def provider_from_dict(data: dict[str, Any], default_model: str) -> Provider:
    provider_id = str(data.get("id", "")).strip()
    if not provider_id:
        raise ValueError("Each provider must include a non-empty 'id'.")

    known_keys = {
        "id",
        "role",
        "goal",
        "backstory",
        "model",
        "type",
        "provider_class",
        "selfcontained",
        "ollama_host",
        "verbose",
        "allow_delegation",
    }
    provider_options = {k: v for k, v in data.items() if k not in known_keys}

    config = ProviderConfig(
        id=provider_id,
        role=str(data.get("role", "")).strip(),
        goal=str(data.get("goal", "")).strip(),
        backstory=str(data.get("backstory", "")).strip(),
        model=str(data.get("model", default_model)).strip(),
        provider_type=str(data.get("type", "crewai")).strip().lower(),
        provider_class=str(data.get("provider_class", "")).strip(),
        provider_options=provider_options,
        selfcontained=bool(data.get("selfcontained", False)),
        ollama_host=str(data.get("ollama_host", "")).strip(),
        verbose=bool(data.get("verbose", True)),
        allow_delegation=bool(data.get("allow_delegation", False)),
    )

    if not config.role:
        raise ValueError(f"Provider '{config.id}' is missing 'role'.")
    if not config.goal:
        raise ValueError(f"Provider '{config.id}' is missing 'goal'.")
    if not config.backstory:
        raise ValueError(f"Provider '{config.id}' is missing 'backstory'.")
    if not config.model:
        raise ValueError(f"Provider '{config.id}' is missing 'model'.")
    provider_class = _load_provider_class(config)
    return provider_class(config)
