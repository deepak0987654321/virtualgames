import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    label: string;
    value: string;
    icon?: any; // Component
}

interface CustomSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    icon?: any; // Leading icon
    label?: string;
    disabled?: boolean;
    className?: string; // For extra styling if needed
}

export default function CustomSelect({ options, value, onChange, placeholder = "Select...", icon: Icon, label, disabled = false, className }: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(o => o.value === value);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`custom-select-container ${className || ''}`} ref={containerRef} style={{ position: 'relative', minWidth: '180px' }}>
            {label && (
                <label style={{ display: 'block', marginBottom: '8px', opacity: 0.7, fontSize: '0.85rem', fontWeight: 500, paddingLeft: '4px' }}>
                    {label}
                </label>
            )}

            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-surface-secondary)',
                    border: isOpen ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.6 : 1,
                    transition: 'all 0.2s',
                    color: 'var(--text-primary)',
                    boxShadow: isOpen ? '0 0 0 2px var(--accent-glow)' : 'none'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {Icon && <Icon size={18} color="var(--accent)" />}
                    {selectedOption?.icon && <selectedOption.icon size={16} />}
                    <span style={{ fontSize: '0.95rem', fontWeight: selectedOption ? 500 : 400, opacity: selectedOption ? 1 : 0.5 }}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown size={18} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', opacity: 0.7 }} />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="select-dropdown glass-panel" style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    marginTop: '8px',
                    padding: '6px',
                    zIndex: 1000,
                    maxHeight: '250px',
                    overflowY: 'auto',
                    animation: 'slideDown 0.2s ease-out',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-panel)', // Ensure solid background + blur
                }}>
                    {options.map((opt) => (
                        <div
                            key={opt.value}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                            className="select-option"
                            style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                transition: 'all 0.1s',
                                background: opt.value === value ? 'var(--bg-surface-secondary)' : 'transparent',
                                color: opt.value === value ? 'var(--accent)' : 'var(--text-primary)',
                                marginBottom: '2px'
                            }}
                            onMouseEnter={e => {
                                if (opt.value !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            }}
                            onMouseLeave={e => {
                                if (opt.value !== value) e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {opt.icon && <opt.icon size={16} />}
                                <span>{opt.label}</span>
                            </div>
                            {opt.value === value && <Check size={16} />}
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
