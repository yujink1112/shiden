import React, { useEffect, useRef, useState } from 'react';

interface StoryTitleProps {
    chapter: number;
    stage: number;
    title: string;
    stageLabelOverride?: string;
    metaOverride?: string;
    separator?: string;
    onComplete: () => void;
}

const StoryTitle: React.FC<StoryTitleProps> = ({ chapter, stage, title, stageLabelOverride, metaOverride, separator = '―', onComplete }) => {
    const [phase, setPhase] = useState<'fadein' | 'visible' | 'fadeout'>('fadein');
    const onCompleteRef = useRef(onComplete);
    const stageLabel = stageLabelOverride || (stage === 12 ? '最終節' : `第${stage}節`);
    const metaText = metaOverride || `第${chapter}章 ${separator} ${stageLabel}`;

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        setPhase('fadein');
        const timer1 = setTimeout(() => setPhase('visible'), 2000);
        const timer2 = setTimeout(() => setPhase('fadeout'), 4500);
        const timer3 = setTimeout(() => onCompleteRef.current(), 6500);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, []);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30000,
            opacity: phase === 'fadeout' ? 0 : 1,
            transition: 'opacity 2s ease-in-out',
            color: '#fff',
            fontFamily: '"Times New Roman", serif',
            pointerEvents: 'none',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none'
        }}>
            <div style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                animation: phase === 'fadein' ? 'title-slide-up 2s ease-out' : 'none'
            }}>
                <div className="StoryTitleMeta" style={{
                    opacity: phase === 'fadein' ? 0 : 1,
                    transition: 'opacity 1s ease-in-out 0.5s'
                }}>
                    {metaText}
                </div>
                
                <div style={{
                    height: '2px',
                    width: phase === 'fadein' ? '0%' : '150px',
                    backgroundColor: '#ffd700',
                    margin: '15px 0',
                    transition: 'width 1.5s ease-in-out 1s',
                    boxShadow: '0 0 10px #ffd700'
                }} />

                <div className="StoryTitleName" style={{
                    opacity: phase === 'fadein' ? 0 : 1,
                    transition: 'opacity 1.5s ease-in-out 1.2s'
                }}>
                    {title}
                </div>
            </div>

            <style>{`
                @keyframes title-slide-up {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default StoryTitle;
