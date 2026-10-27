import { UserRole } from '@/app/context/AppContext';

export const useTheme = (role: UserRole | undefined) => {
  const getThemeClasses = () => {
    switch (role) {
      case 'admin':
        return {
          background: 'bg-gradient-to-br from-[#001f3f] via-[#003366] to-[#001a33]',
          text: 'text-[#FFD700]',
          card: 'bg-[#002952]/80 border-[#FFD700]',
          button: 'bg-[#FFD700] text-[#001f3f] hover:bg-[#FFC700]',
          accent: 'text-[#FFD700]'
        };
      case 'coordinator':
        return {
          background: 'bg-gradient-to-br from-black via-[#1a1a1a] to-black',
          text: 'text-[#FFD700]',
          card: 'bg-[#2a2a2a]/80 border-[#FFD700]',
          button: 'bg-[#FFD700] text-black hover:bg-[#FFC700]',
          accent: 'text-[#FFD700]'
        };
      case 'crew':
        return {
          background: 'bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800',
          text: 'text-white',
          card: 'bg-purple-800/50 border-purple-400',
          button: 'bg-purple-600 text-white hover:bg-purple-500',
          accent: 'text-purple-300'
        };
      case 'attendee':
        return {
          background: 'bg-gradient-to-br from-red-500 via-orange-500 to-pink-500',
          text: 'text-white',
          card: 'bg-white/10 border-white/30',
          button: 'bg-white text-red-600 hover:bg-gray-100',
          accent: 'text-pink-200'
        };
      default:
        return {
          background: 'bg-gray-900',
          text: 'text-white',
          card: 'bg-gray-800/80 border-gray-600',
          button: 'bg-blue-600 text-white hover:bg-blue-500',
          accent: 'text-blue-400'
        };
    }
  };

  return getThemeClasses();
};
