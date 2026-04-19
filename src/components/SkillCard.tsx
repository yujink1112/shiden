import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ALL_SKILLS, SkillDetail, STATUS_DATA } from '../skillsData';
import { getStorageUrl } from '../firebase';

export type IconMode = 'ORIGINAL' | 'ABBR' | 'PHONE';

interface SkillCardProps {
  skill: SkillDetail;
  isSelected?: boolean;
  onClick?: (abbr: string) => void;
  disableTooltip?: boolean;
  iconMode?: IconMode;
  id?: string;
  isConnected?: boolean;
  isDimmed?: boolean;
}

const SkillCard: React.FC<SkillCardProps> = ({ skill, isSelected, onClick, id, isConnected, isDimmed, disableTooltip, iconMode }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isTooltipForceClosed, setIsTooltipForceClosed] = useState(false);
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const openTooltip = () => {
    if (disableTooltip) return;

    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setShowTooltip(true);
    setIsTooltipForceClosed(false);
  };

  const handleClick = () => {
    if (onClick) {
      onClick(skill.abbr);
    }
  };

  const renderFormattedDescription = (text: string) => {
    let parts: (string | React.ReactNode)[] = [text];
    
    STATUS_DATA.forEach(status => {
      const newParts: (string | React.ReactNode)[] = [];
      parts.forEach(part => {
        if (typeof part === 'string') {
          const regex = new RegExp(`(${status.name})`, 'g');
          const subParts = part.split(regex);
          subParts.forEach(subPart => {
            if (subPart === status.name) {
              newParts.push(
                <span 
                  key={status.name + Math.random()}
                  onMouseEnter={() => setHoveredStatus(status.name)}
                  onMouseLeave={() => setHoveredStatus(null)}
                  style={{ color: '#ffeb3b', textDecoration: 'underline', cursor: 'help', fontWeight: 'bold', pointerEvents: 'auto' }}
                >
                  {subPart}
                </span>
              );
            } else {
              newParts.push(subPart);
            }
          });
        } else {
          newParts.push(part);
        }
      });
      parts = newParts;
    });

    return parts.map((part, i) => {
        if (typeof part === 'string') {
            return part.split('\n').map((line, j) => (
                <React.Fragment key={`${i}-${j}`}>
                    {line}
                    {j < part.split('\n').length - 1 && <br />}
                </React.Fragment>
            ));
        }
        return part;
    });
  };

  const cardRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<'center' | 'left' | 'right'>('center');
  const [isTooltipBelow, setIsTooltipBelow] = useState(false);
  const [cardRect, setCardRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      if (showTooltip && cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        setCardRect(rect);
        const screenWidth = window.innerWidth;
        const margin = 20;
        const tooltipWidth = 220;
        const estimatedTooltipHeight = 150;

        const spaceAbove = rect.top;
        if (spaceAbove < estimatedTooltipHeight) {
          setIsTooltipBelow(true);
        } else {
          setIsTooltipBelow(false);
        }

        const deneiPanel = document.getElementById('deneiSkillPanel');
        const bossPanel = document.querySelector('.BossSkillPreview');
        const containerPanel = deneiPanel || bossPanel;

        if (containerPanel) {
          const panelRect = containerPanel.getBoundingClientRect();
          const relativeLeft = rect.left - panelRect.left;
          const relativeRight = panelRect.right - rect.right;

          const spaceInPanelAbove = rect.top - panelRect.top;
          if (spaceInPanelAbove < estimatedTooltipHeight) {
            setIsTooltipBelow(true);
          }

          if (relativeLeft < tooltipWidth / 2) {
            setTooltipPos('left');
          } else if (relativeRight < tooltipWidth / 2) {
            setTooltipPos('right');
          } else {
            setTooltipPos('center');
          }
        } else {
          if (rect.left < tooltipWidth / 2 + margin) {
            setTooltipPos('left');
          } else if (screenWidth - rect.right < tooltipWidth / 2 + margin) {
            setTooltipPos('right');
          } else {
            setTooltipPos('center');
          }
        }
      }
    };

    if (showTooltip) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showTooltip]);

  const getTooltipStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      backgroundColor: 'rgba(30, 30, 30, 0.95)',
      color: 'white',
      padding: '12px',
      borderRadius: '8px',
      whiteSpace: 'normal',
      zIndex: 9999,
      textAlign: 'left',
      boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
      minWidth: '220px',
      maxWidth: '300px',
      pointerEvents: 'auto',
      fontSize: '12px',
      lineHeight: '1.4',
      border: '1px solid #555',
    };

    if (!cardRect) return { ...base, display: 'none' };

    const top = isTooltipBelow ? cardRect.bottom + 5 : cardRect.top - 5;
    let left = cardRect.left + cardRect.width / 2;
    let transform = 'translate(-50%, ' + (isTooltipBelow ? '0' : '-100%') + ')';

    if (tooltipPos === 'left') {
      left = cardRect.left;
      transform = isTooltipBelow ? 'none' : 'translateY(-100%)';
    } else if (tooltipPos === 'right') {
      left = cardRect.right;
      transform = isTooltipBelow ? 'translateX(-100%)' : 'translate(-100%, -100%)';
    }

    return { ...base, top, left, transform };
  };

  const renderIcon = () => {
    if (iconMode === 'ABBR') {
      return (
        <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#333', border: '1px solid #666', borderRadius: '4px', fontSize: '18px', fontWeight: 'bold', color: '#fff', filter: isDimmed ? 'grayscale(100%)' : 'none' }}>
          {skill.abbr}
        </div>
      );
    }
    if (iconMode === 'PHONE') {
      const allAbbrs = ALL_SKILLS.map(s => s.abbr);
      const index = allAbbrs.indexOf(skill.abbr);
      let char = '';
      if (index >= 0 && index <= 9) char = index.toString();
      else if (index >= 10 && index <= 35) char = String.fromCharCode(65 + (index - 10)); // A-Z
      else char = '?';
      
      return (
        <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a', border: '2px solid #4fc3f7', borderRadius: '50%', fontSize: '20px', fontWeight: 'bold', color: '#4fc3f7', boxShadow: '0 0 5px #4fc3f7', filter: isDimmed ? 'grayscale(100%)' : 'none' }}>
          {char}
        </div>
      );
    }
    return <img src={getStorageUrl(skill.icon)} alt={skill.name} className="skill-icon image-fade-in" style={{ filter: isDimmed ? 'grayscale(100%)' : 'drop-shadow(0 0 2px rgba(255,255,255,0.2))' }} />;
  };

  return (
    <div
      id={id}
      ref={cardRef}
      className={(isConnected ? 'synergy-active ' : '') + 'skill-card'}
      onClick={handleClick}
      onPointerDown={(e) => {
        if (e.pointerType === 'touch' || e.pointerType === 'pen') {
          openTooltip();
        }
      }}
      onMouseEnter={openTooltip}
      onMouseLeave={() => {
        if (!disableTooltip) {
          tooltipTimeoutRef.current = setTimeout(() => {
            setShowTooltip(false);
          }, 200);
        }
      }}
      style={{
        border: isConnected ? '3px solid #ffeb3b' : (isDimmed ? '3px solid #333' : (isSelected ? '3px solid gold' : (skill.kamiwaza === 1 ? '3px solid #de63fd' : '1px solid #444'))),
        borderRadius: '8px',
        padding: '8px',
        margin: '2px',
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: isConnected ? '#4a4a00' : (isSelected ? '#333300' : (skill.kamiwaza === 1 ? '#2a1a3a' : '#1a1a1a')),
        color: isDimmed ? '#666' : '#eee',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxShadow: isConnected ? '0 0 20px #ffeb3b, inset 0 0 15px #ffeb3b' : (isDimmed ? 'none' : (skill.kamiwaza === 1 ? '0 0 15px #de63fd' : (isSelected ? '0 0 10px rgba(255,215,0,0.7)' : '0 2px 4px rgba(0,0,0,0.3)'))),
        position: 'relative',
        transition: 'all 0.3s ease',
        filter: isDimmed ? 'grayscale(80%)' : 'none',
        opacity: isDimmed ? 0.7 : 1,
      }}
    >
      {renderIcon()}
      <span className="skill-name">{skill.name}</span>
      {showTooltip && !isTooltipForceClosed && createPortal(
        <div 
          style={getTooltipStyle()}
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={() => {
            if (tooltipTimeoutRef.current) {
              clearTimeout(tooltipTimeoutRef.current);
              tooltipTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            tooltipTimeoutRef.current = setTimeout(() => {
              setShowTooltip(false);
            }, 300);
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'baseline' }}>
            <div>
                <strong style={{ fontSize: '14px', color: '#ffd700' }}>{skill.name}</strong>
                <span style={{ fontSize: '10px', color: '#aaa', marginLeft: '8px' }}>{skill.kana}</span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsTooltipForceClosed(true); }}
              style={{ background: '#555', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', padding: '2px 6px' }}
            >
              閉じる
            </button>
          </div>
          <strong>種別:</strong> <span style={{ color: '#61dafb' }}>{skill.type}</span><br />
          <strong>速度:</strong> <span style={{ color: '#61dafb' }}>{skill.speed}</span><br />
          {renderFormattedDescription(skill.description)}

          {hoveredStatus && (
            <div style={{
              position: 'absolute',
              left: window.innerWidth < 600 ? '0' : '105%',
              top: window.innerWidth < 600 ? '105%' : 0,
              backgroundColor: '#444',
              color: '#fff',
              padding: '10px',
              borderRadius: '5px',
              width: window.innerWidth < 600 ? '100%' : '200px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
              zIndex: 10000,
              border: '1px solid #ffd700',
              boxSizing: 'border-box'
            }}>
              <strong style={{ color: '#ffd700' }}>【{hoveredStatus}】</strong><br />
              {STATUS_DATA.find(s => s.name === hoveredStatus)?.description}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default SkillCard;
