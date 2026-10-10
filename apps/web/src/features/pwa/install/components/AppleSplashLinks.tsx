import { appleSplashPath, appleSplashScreens } from "../constants/appleSplashScreens";
import { toAppleSplashMediaQuery } from "../utils/appleSplashMedia";

export const AppleSplashLinks = () => (
  <>
    {appleSplashScreens.map((screen) => (
      <link
        key={appleSplashPath(screen)}
        rel="apple-touch-startup-image"
        href={appleSplashPath(screen)}
        media={toAppleSplashMediaQuery(screen)}
      />
    ))}
  </>
);
