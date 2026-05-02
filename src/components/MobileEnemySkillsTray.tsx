import React from 'react';
import SkillCard from './SkillCard';
import { SkillDetail } from '../skillsData';

type MobileEnemySkillsTrayProps = {
  isMobile: boolean;
  gameStarted: boolean;
  enemySkills: SkillDetail[];
  enemyTitle: string;
  targetRef: React.RefObject<HTMLDivElement | null>;
  accentColor?: string;
};

const MobileEnemySkillsTray: React.FC<MobileEnemySkillsTrayProps> = ({
  isMobile,
  gameStarted,
  enemySkills,
  enemyTitle,
  targetRef,
  accentColor = '#ffb3b3'
}) => {
  const [shouldShowTray, setShouldShowTray] = React.useState(false);

  React.useEffect(() => {
    if (!isMobile || gameStarted || enemySkills.length === 0) {
      setShouldShowTray(false);
    }
  }, [enemySkills.length, gameStarted, isMobile]);

  React.useEffect(() => {
    if (!isMobile || gameStarted || enemySkills.length === 0) return;

    const updateVisibility = () => {
      const target = targetRef.current;
      if (!target) {
        setShouldShowTray(false);
        return;
      }

      const rect = target.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const isVisible = rect.bottom > 0 && rect.top < viewportHeight;
      setShouldShowTray(!isVisible);
    };

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, true);
    window.addEventListener('resize', updateVisibility);

    return () => {
      window.removeEventListener('scroll', updateVisibility, true);
      window.removeEventListener('resize', updateVisibility);
    };
  }, [enemySkills.length, gameStarted, isMobile, targetRef]);

  if (!isMobile || gameStarted || enemySkills.length === 0 || !shouldShowTray) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: '10px',
        right: '10px',
        top: 'calc(10px + env(safe-area-inset-top, 0px))',
        zIndex: 1497,
        borderRadius: '16px',
        border: '1px solid rgba(255, 179, 179, 0.3)',
        background: 'linear-gradient(180deg, rgba(36, 14, 18, 0.96), rgba(24, 10, 14, 0.92))',
        boxShadow: '0 16px 34px rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(10px)',
        padding: '10px 10px 8px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div>
          <div style={{ color: accentColor, fontSize: '0.7rem', letterSpacing: '0.12em' }}>ENEMY SKILLS</div>
          <div style={{ color: '#fff', fontSize: '0.88rem', fontWeight: 'bold' }}>{enemyTitle}</div>
        </div>
        <div style={{ color: '#d8bfc2', fontSize: '0.64rem', textAlign: 'right', lineHeight: 1.4 }}>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
        {enemySkills.map((skill, index) => (
          <SkillCard
            key={`${skill.abbr}-${index}`}
            skill={skill}
            isSelected={false}
            disableTooltip={true}
          />
        ))}
      </div>
    </div>
  );
};

export default MobileEnemySkillsTray;
