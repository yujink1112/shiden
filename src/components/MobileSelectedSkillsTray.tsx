import React from 'react';
import SkillCard, { IconMode } from './SkillCard';
import { SkillDetail } from '../skillsData';

type MobileSelectedSkillsTrayProps = {
  isMobile: boolean;
  selectedPlayerSkills: string[];
  getSkillCardsFromAbbrs: (abbrs: string[]) => SkillDetail[];
  iconMode: IconMode;
  gameStarted: boolean;
  handleSelectedSkillClick: (abbr: string) => void;
  connections: { fromId: string; toId: string }[];
  dimmedIndices: number[];
};

const MobileSelectedSkillsTray: React.FC<MobileSelectedSkillsTrayProps> = ({
  isMobile,
  selectedPlayerSkills,
  getSkillCardsFromAbbrs,
  iconMode,
  gameStarted,
  handleSelectedSkillClick,
  connections,
  dimmedIndices
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isMobile || selectedPlayerSkills.length === 0) {
      setIsOpen(false);
    }
  }, [isMobile, selectedPlayerSkills.length]);

  if (!isMobile || selectedPlayerSkills.length === 0) return null;

  const selectedSkills = getSkillCardsFromAbbrs(selectedPlayerSkills);

  return (
    <>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.48)',
            backdropFilter: 'blur(3px)',
            zIndex: 1498,
            WebkitTapHighlightColor: 'transparent'
          }}
        />
      )}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          position: 'fixed',
          right: '12px',
          bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
          zIndex: 1499,
          border: '1px solid rgba(130, 220, 255, 0.45)',
          borderRadius: '999px',
          background: 'linear-gradient(180deg, rgba(10, 28, 52, 0.94), rgba(8, 20, 38, 0.88))',
          color: '#e9f8ff',
          padding: '10px 14px',
          boxShadow: '0 10px 24px rgba(0, 0, 0, 0.35)',
          fontSize: '0.88rem',
          fontWeight: 'bold',
          letterSpacing: '0.08em',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        編成 {selectedPlayerSkills.length}/5
      </button>
      <div
        style={{
          position: 'fixed',
          left: '10px',
          right: '10px',
          bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))',
          zIndex: 1500,
          borderRadius: '18px',
          border: '1px solid rgba(130, 220, 255, 0.35)',
          background: 'linear-gradient(180deg, rgba(10, 24, 42, 0.96), rgba(6, 14, 28, 0.92))',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.42)',
          backdropFilter: 'blur(12px)',
          padding: '14px 12px 12px',
          transform: isOpen ? 'translateY(0)' : 'translateY(calc(100% + 26px))',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'transform 0.24s ease, opacity 0.2s ease',
          maxHeight: '46vh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '10px' }}>
          <div>
            <div style={{ color: '#9edcff', fontSize: '0.76rem', letterSpacing: '0.12em' }}>SELECTED SKILLS</div>
            <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold' }}>現在の編成</div>
          </div>
          {!gameStarted && (
            <div style={{ color: '#b8c7d4', fontSize: '0.7rem', textAlign: 'right', lineHeight: 1.5 }}>
              スキルをタップすると
              <br />
              編成から外せます
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
          {selectedSkills.map((skill, index) => (
            <SkillCard
              key={`${skill.abbr}-${index}`}
              id={`mobile-selected-skill-${index}`}
              skill={skill}
              isSelected={true}
              isConnected={connections.some((c) => c.fromId === `selected-skill-${index}` || c.toId === `selected-skill-${index}`)}
              isDimmed={dimmedIndices.includes(index)}
              onClick={gameStarted ? undefined : handleSelectedSkillClick}
              disableTooltip={!gameStarted}
              iconMode={iconMode}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default MobileSelectedSkillsTray;
