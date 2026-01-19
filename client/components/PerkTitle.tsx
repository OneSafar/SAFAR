import React from 'react';

interface PerkTitleProps {
    title: string;
    type?: 'aura' | 'echo' | 'seasonal' | 'badge' | 'title';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

/**
 * PerkTitle Component
 * Displays a perk/achievement title with glowing border styling
 */
export default function PerkTitle({ title, type = 'aura', size = 'md', className = '' }: PerkTitleProps) {
    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-1.5',
    };

    // Glowing border colors based on type
    const glowStyles: Record<string, string> = {
        aura: 'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5),0_0_20px_rgba(251,191,36,0.3)] text-amber-500 dark:text-amber-400',
        echo: 'border-purple-400 shadow-[0_0_10px_rgba(167,139,250,0.5),0_0_20px_rgba(167,139,250,0.3)] text-purple-500 dark:text-purple-400',
        seasonal: 'border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5),0_0_20px_rgba(52,211,153,0.3)] text-emerald-500 dark:text-emerald-400',
        badge: 'border-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5),0_0_20px_rgba(45,212,191,0.3)] text-teal-500 dark:text-teal-400',
        title: 'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5),0_0_20px_rgba(251,191,36,0.3)] text-amber-500 dark:text-amber-400',
    };

    return (
        <span
            className={`
                inline-flex items-center font-semibold italic rounded-md border-2
                bg-gradient-to-r from-amber-500/10 to-yellow-500/10 dark:from-amber-500/20 dark:to-yellow-500/20
                animate-pulse-slow
                ${sizeClasses[size]}
                ${glowStyles[type] || glowStyles.aura}
                ${className}
            `}
        >
            {title}
        </span>
    );
}
