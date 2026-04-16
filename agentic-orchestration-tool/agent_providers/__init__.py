"""Agent-provider package: YAML-driven LLM backends that build CrewAI ``Agent`` instances."""

from agent_providers.anthropic_provider import AnthropicProvider
from agent_providers.base import AgentProvider, AgentProviderConfig
from agent_providers.crewai_provider import CrewAIProvider
from agent_providers.factory import (
    AGENT_PROVIDER_TYPE_REGISTRY,
    agent_provider_from_dict,
    provider_from_dict,
)
from agent_providers.huggingface_provider import HuggingfaceProvider
from agent_providers.jetstream_provider import JetstreamProvider
from agent_providers.ollama_provider import OllamaProvider
from agent_providers.openai_provider import OpenAIProvider
from agent_providers.vllm_provider import VllmProvider

__all__ = [
    "AGENT_PROVIDER_TYPE_REGISTRY",
    "AgentProvider",
    "AgentProviderConfig",
    "AnthropicProvider",
    "CrewAIProvider",
    "HuggingfaceProvider",
    "JetstreamProvider",
    "OllamaProvider",
    "OpenAIProvider",
    "VllmProvider",
    "agent_provider_from_dict",
    "provider_from_dict",
]
