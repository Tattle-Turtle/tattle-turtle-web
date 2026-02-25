/**
 * Eyes that react to who is speaking / listening during a call.
 * Used on the character avatar to make the conversation feel more alive for kids.
 */
import { motion } from 'motion/react';
import { clsx } from 'clsx';

export type ReactiveEyesProps = {
  /** Child is speaking (voice or just sent) */
  isChildSpeaking?: boolean;
  /** AI/character is speaking */
  isAISpeaking?: boolean;
  /** Mic is on and we're listening for the child */
  isListening?: boolean;
  /** Waiting for AI response */
  isLoading?: boolean;
  /** Size of the eye container (eyes scale with this) */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClasses = {
  sm: 'w-16 h-8 gap-2',
  md: 'w-24 h-12 gap-3',
  lg: 'w-32 h-16 gap-4',
};

const pupilScale = {
  sm: 6,
  md: 8,
  lg: 10,
};

export function ReactiveEyes({
  isChildSpeaking = false,
  isAISpeaking = false,
  isListening = false,
  isLoading = false,
  size = 'lg',
  className,
}: ReactiveEyesProps) {
  const s = sizeClasses[size];
  const pupilSize = pupilScale[size];

  // Pupil offset in px: look left when child speaks, right when AI speaks
  const lookLeft = isChildSpeaking ? 1 : 0;
  const lookRight = isAISpeaking ? 1 : 0;
  const xOffset = (lookRight - lookLeft) * 6;

  // Widen when listening, squint when loading
  const scaleY = isListening ? 1.15 : isLoading ? 0.6 : 1;
  const scaleX = isLoading ? 0.85 : 1;

  return (
    <div
      className={clsx('flex items-center justify-center pointer-events-none', s, className)}
      aria-hidden
    >
      {/* Left eye */}
      <motion.div
        className="relative rounded-full bg-white border-2 border-slate-300 overflow-hidden flex items-center justify-center"
        style={{ width: pupilSize * 2.4, height: pupilSize * 2 }}
        animate={{
          scaleX,
          scaleY,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <motion.div
          className="absolute rounded-full bg-slate-800"
          style={{ width: pupilSize, height: pupilSize }}
          animate={{ x: xOffset }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />
      </motion.div>

      {/* Right eye */}
      <motion.div
        className="relative rounded-full bg-white border-2 border-slate-300 overflow-hidden flex items-center justify-center"
        style={{ width: pupilSize * 2.4, height: pupilSize * 2 }}
        animate={{
          scaleX,
          scaleY,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <motion.div
          className="absolute rounded-full bg-slate-800"
          style={{ width: pupilSize, height: pupilSize }}
          animate={{ x: xOffset }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />
      </motion.div>
    </div>
  );
}
