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
  panelRef: React.RefObject<HTMLDivElement | null>;
};

const MobileSelectedSkillsTray: React.FC<MobileSelectedSkillsTrayProps> = ({
  isMobile,
  selectedPlayerSkills,
  getSkillCardsFromAbbrs,
  iconMode,
  gameStarted,
  handleSelectedSkillClick,
  connections,
  dimmedIndices,
  panelRef
}) => {
  const [shouldShowTrayButton, setShouldShowTrayButton] = React.useState(false);

  React.useEffect(() => {
    if (!isMobile || selectedPlayerSkills.length === 0 || gameStarted) {
      setShouldShowTrayButton(false);
    }
  }, [gameStarted, isMobile, selectedPlayerSkills.length]);

  React.useEffect(() => {
    if (!isMobile || selectedPlayerSkills.length === 0 || gameStarted) return;

    const updateVisibility = () => {
      const panel = panelRef.current;
      if (!panel) {
        setShouldShowTrayButton(false);
        return;
      }

      const rect = panel.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const isVisible = rect.bottom > 0 && rect.top < viewportHeight;

      setShouldShowTrayButton(!isVisible);
    };

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, true);
    window.addEventListener('resize', updateVisibility);

    return () => {
      window.removeEventListener('scroll', updateVisibility, true);
      window.removeEventListener('resize', updateVisibility);
    };
  }, [gameStarted, isMobile, panelRef, selectedPlayerSkills.length]);

  if (!isMobile || selectedPlayerSkills.length === 0 || gameStarted || !shouldShowTrayButton) return null;

  const selectedSkills = getSkillCardsFromAbbrs(selectedPlayerSkills);

  return (
    <div
      style={{
        position: 'fixed',
        left: '10px',
        right: '10px',
        bottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        zIndex: 1500,
        borderRadius: '18px',
        border: '1px solid rgba(130, 220, 255, 0.35)',
        background: 'linear-gradient(180deg, rgba(10, 24, 42, 0.78), rgba(6, 14, 28, 0.72))',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.42)',
        backdropFilter: 'blur(10px)',
        padding: '12px 10px 10px',
        transition: 'transform 0.24s ease, opacity 0.2s ease',
        maxHeight: '32vh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '10px' }}>
        <div>
          <div style={{ color: '#9edcff', fontSize: '0.72rem', letterSpacing: '0.12em' }}>SELECTED SKILLS</div>
          <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 'bold' }}>現在の編成 {selectedPlayerSkills.length}/5</div>
        </div>
        <div style={{ color: '#b8c7d4', fontSize: '0.66rem', textAlign: 'right', lineHeight: 1.45 }}>
          ここからでもスキルを外せます
        </div>
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
            onClick={handleSelectedSkillClick}
            disableTooltip={true}
            iconMode={iconMode}
          />
        ))}
      </div>
    </div>
  );
};

export default MobileSelectedSkillsTray;
