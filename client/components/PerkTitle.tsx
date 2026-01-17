import React from 'react';

interface PerkTitleProps {
    title: string;
    type?: 'aura' | 'echo' | 'seasonal';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

/**
 * PerkTitle Component
 * Displays a perk title with golden aura styling
 * Uses CSS classes defined in global.css: .perk-title, .perk-title-aura, etc.
 */
export default function PerkTitle({ title, type = 'aura', size = 'md', className = '' }: PerkTitleProps) {
    const sizeClasses = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-xl',
    };

    const typeClass = type === 'aura'
        ? 'perk-title-aura'
        : type === 'seasonal'
            ? 'perk-title-seasonal'
            : 'perk-title-echo';

    return (
        <span className={`perk-container ${className}`}>
            <span className={`${typeClass} ${sizeClasses[size]}`}>
                {title}
            </span>
        </span>
    );
}
