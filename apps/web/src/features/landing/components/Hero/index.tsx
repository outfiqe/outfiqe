import { getHeroSlidesServer } from "./getHeroSlidesServer";
import { HeroCarousel } from "./HeroCarousel";

export const Hero = async () => {
  const slides = await getHeroSlidesServer();
  if (slides.length === 0) return null;

  return <HeroCarousel slides={slides} />;
};
