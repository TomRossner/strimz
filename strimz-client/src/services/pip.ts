const listeners = new Set<() => void>();

let pipActive = false;
let returnToPlayer = false;

const notify = () => listeners.forEach((listener) => listener());

export const getPipActive = () => pipActive;

export const getReturnToPlayer = () => returnToPlayer;

export const subscribePip = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const setPipActive = (active: boolean) => {
    if (pipActive === active) return;
    pipActive = active;
    notify();
};

export const leavePictureInPicture = (backToTab: boolean) => {
    const changed = pipActive || returnToPlayer !== backToTab;
    pipActive = false;
    returnToPlayer = backToTab;
    if (changed) notify();
};

export const clearReturnToPlayer = () => {
    if (!returnToPlayer) return;
    returnToPlayer = false;
    notify();
};
