const listeners = new Set<() => void>();

let pipActive = false;

export const getPipActive = () => pipActive;

export const subscribePip = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const setPipActive = (active: boolean) => {
    if (pipActive === active) return;
    pipActive = active;
    listeners.forEach((listener) => listener());
};
