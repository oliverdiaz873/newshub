import localFont from 'next/font/local'

export const domine = localFont({
  src: [
    {
      path: '../../assets/fonts/Domine/Domine-Regular.ttf',
      weight: '400',
    },
    {
      path: '../../assets/fonts/Domine/Domine-Medium.ttf',
      weight: '500',
    },
    {
      path: '../../assets/fonts/Domine/Domine-SemiBold.ttf',
      weight: '600',
    },
    {
      path: '../../assets/fonts/Domine/Domine-Bold.ttf',
      weight: '700',
    },
  ],
  variable: '--font-domine',
})
