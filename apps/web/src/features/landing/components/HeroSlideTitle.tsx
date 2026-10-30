const HERO_TITLE_CLASS =
  "mt-1.5 max-w-xl whitespace-pre-line font-display text-xl font-extrabold uppercase leading-[0.95] text-white sm:mt-3 sm:text-5xl lg:text-6xl";

type HeroSlideTitleProps = {
  title: string;
  isPageHeading: boolean;
};

export const HeroSlideTitle = ({ title, isPageHeading }: HeroSlideTitleProps) => {
  const SlideHeading = isPageHeading ? "h1" : "h2";
  return <SlideHeading className={HERO_TITLE_CLASS}>{title}</SlideHeading>;
};
