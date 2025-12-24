import { motion, type Variants } from 'framer-motion';
import type { BrainState } from '../../types';

export const SaviaOrb = ({ state }: { state: BrainState }) => {
    // Define variants for the "Living" Orb behavior
    const variants: Variants = {
        IDLE: {
            scale: [1, 1.1, 1],
            opacity: 0.8,
            backgroundColor: "#60A5FA" // Blue
        },
        LISTENING: {
            scale: [1, 1.5, 1],
            backgroundColor: "#34D399" // Green
        },
        REASONING: {
            rotate: 360,
            borderRadius: ["50%", "30%", "50%"],
            backgroundColor: "#8B5CF6", // Purple (Logic)
            transition: { duration: 1, repeat: Infinity, ease: "linear" }
        },
        SPEAKING: {
            scale: [1, 1.2, 0.9, 1.1],
            backgroundColor: "#F472B6" // Pink
        },
        HALTED: {
            scale: 1,
            backgroundColor: "#EF4444" // Red
        }
    };

    return (
        <div className="flex justify-center items-center h-64 relative">
            {/* Outer Glow */}
            <motion.div
                className="w-32 h-32 rounded-full blur-xl absolute"
                animate={state}
                variants={variants}
                transition={{ duration: 2, repeat: Infinity }}
            />
            {/* Core Orb */}
            <motion.div
                className="w-24 h-24 rounded-full bg-white relative z-10 shadow-lg"
                animate={state}
                variants={variants}
                transition={{ duration: state === 'REASONING' ? 1 : 2, repeat: Infinity }}
            />
        </div>
    );
};
