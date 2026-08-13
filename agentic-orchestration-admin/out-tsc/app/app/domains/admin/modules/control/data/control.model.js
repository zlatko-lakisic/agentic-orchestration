export function targetsInGroup(targets, group) {
    return (targets || []).filter((t) => t.group === group);
}
export function canSubmitConfirm(phrase, typed) {
    if (!phrase)
        return true;
    return String(typed || '').trim() === phrase;
}
export function controlConfirmSpec(target, hostname) {
    const host = hostname || 'this server';
    if (target.id === 'host') {
        return {
            title: 'Reboot this server',
            body: `This reboots ${host}. Admin, Kubernetes, Ollama, and Reach all go down until the machine is back.`,
            phrase: target.confirmPhrase || 'REBOOT',
            confirmLabel: 'Reboot server',
            danger: true,
        };
    }
    if (target.id === 'stack') {
        return {
            title: 'Restart AO Kubernetes stack',
            body: 'Rolls every AO deployment (sidecars, broker, warm pool, engine, then coordinator). Admin disconnects briefly.',
            phrase: null,
            confirmLabel: 'Restart stack',
            danger: true,
        };
    }
    return {
        title: `Restart ${target.label}`,
        body: target.description || `Restart ${target.label}?`,
        phrase: null,
        confirmLabel: 'Restart',
        danger: Boolean(target.disconnectLikely),
    };
}
