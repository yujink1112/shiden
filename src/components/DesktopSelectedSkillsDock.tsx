import React from 'react';
import SkillCard, { IconMode } from './SkillCard';
import { SkillDetail } from '../skillsData';

type DesktopSelectedSkillsDockProps = {
  isMobile: boolean;
  gameStarted: boolean;
  selectedPlayerSkills: string[];
  getSkillCardsFromAbbrs: (abbrs: string[]) => SkillDetail[];
  iconMode: IconMode;
  handleSelectedSkillClick: (abbr: string) => void;
  connections: { fromId: string; toId: string }[];
  dimmedIndices: number[];
};

const DesktopSelectedSkillsDock: React.FC<DesktopSelectedSkillsDockProps> = ({
  isMobile,
  gameStarted,
  selectedPlayerSkills,
  getSkillCardsFromAbbrs,
  iconMode,
  handleSelectedSkillClick,
  connections,
  dimmedIndices
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const hasSelectedSkills = selectedPlayerSkills.length > 0;

  React.useEffect(() => {
    if (isMobile || gameStarted) {
      setIsOpen(false);
      return;
    }

    if (hasSelectedSkills) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [gameStarted, hasSelectedSkills, isMobile]);

  if (isMobile || gameStarted) return null;

  const selectedSkills = getSkillCardsFromAbbrs(selectedPlayerSkills);
  const isPanelVisible = hasSelectedSkills && isOpen;

  return (
    <div
      style={{
        position: 'fixed',
        right: '20px',
        bottom: '20px',
        zIndex: 1400,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '10px'
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (!hasSelectedSkills) return;
          setIsOpen((prev) => !prev);
        }}
        style={{
          border: '1px solid rgba(130, 220, 255, 0.45)',
          borderRadius: '999px',
          background: 'linear-gradient(180deg, rgba(10, 28, 52, 0.96), rgba(8, 20, 38, 0.92))',
          color: '#e9f8ff',
          padding: '12px 16px',
          boxShadow: '0 12px 26px rgba(0, 0, 0, 0.38)',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          letterSpacing: '0.08em',
          cursor: hasSelectedSkills ? 'pointer' : 'default',
          transition: 'transform 0.28s ease, box-shadow 0.2s ease'
        }}
      >
        編成 {selectedPlayerSkills.length}/5 {hasSelectedSkills ? (isOpen ? '▾' : '▴') : ''}
      </button>

      <div
        style={{
          width: 'min(420px, calc(100vw - 40px))',
          borderRadius: '18px',
          border: '1px solid rgba(130, 220, 255, 0.35)',
          background: 'linear-gradient(180deg, rgba(10, 24, 42, 0.97), rgba(6, 14, 28, 0.94))',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.42)',
          backdropFilter: 'blur(12px)',
          padding: '14px',
          transform: isPanelVisible ? 'translateY(0) scale(1)' : 'translateY(18px) scale(0.96)',
          transformOrigin: 'bottom right',
          opacity: isPanelVisible ? 1 : 0,
          maxHeight: isPanelVisible ? '260px' : '0px',
          overflow: 'hidden',
          pointerEvents: isPanelVisible ? 'auto' : 'none',
          transition: 'transform 0.28s ease, opacity 0.2s ease, max-height 0.28s ease, padding 0.28s ease',
          paddingTop: isPanelVisible ? '14px' : '0px',
          paddingRight: isPanelVisible ? '14px' : '14px',
          paddingBottom: isPanelVisible ? '14px' : '0px',
          paddingLeft: isPanelVisible ? '14px' : '14px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div>
            <div style={{ color: '#9edcff', fontSize: '0.74rem', letterSpacing: '0.12em' }}>SELECTED SKILLS</div>
            <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold' }}>現在の編成</div>
          </div>
          <div style={{ color: '#b8c7d4', fontSize: '0.73rem', textAlign: 'right', lineHeight: 1.5 }}>
            ここからでも
            <br />
            スキルを外せます
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '6px', justifyItems: 'center' }}>
          {selectedSkills.map((skill, index) => (
            <SkillCard
              key={`${skill.abbr}-${index}`}
              id={`desktop-selected-skill-${index}`}
              skill={skill}
              isSelected={true}
              isConnected={connections.some((c) => c.fromId === `selected-skill-${index}` || c.toId === `selected-skill-${index}`)}
              isDimmed={dimmedIndices.includes(index)}
              onClick={handleSelectedSkillClick}
              disableTooltip={true}
              iconMode={iconMode}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DesktopSelectedSkillsDock;
