import React, { ReactElement, ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface WithTooltipProps {
    label: ReactNode;
    children: ReactElement;
    side?: 'top' | 'right' | 'bottom' | 'left';
    delayDuration?: number;
    /**
     * Wrap the element in a span that receives the hover. Needed for elements that can be
     * disabled: a disabled button gets no pointer events, so its tooltip would never show.
     */
    wrap?: boolean;
    wrapperClassName?: string;
}

/**
 * Shows the app tooltip (Radix, same look as Button's) on any element, in place of a native
 * title attribute. The child must accept a ref and props (a DOM element does).
 */
const WithTooltip = ({ label, children, side = 'top', delayDuration = 300, wrap = false, wrapperClassName }: WithTooltipProps) => {
    if (!label) return children;

    return (
        <Tooltip delayDuration={delayDuration}>
            <TooltipTrigger asChild>
                {wrap ? <span className={wrapperClassName ?? 'inline-flex'}>{children}</span> : children}
            </TooltipTrigger>
            <TooltipContent side={side} sideOffset={4} className='z-[9999]'>{label}</TooltipContent>
        </Tooltip>
    );
};

export default WithTooltip;
