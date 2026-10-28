import type { Metadata } from "next";

import { homePageMetadata } from "../homePageMetadata";

export const dynamic = "force-static";

export const revalidate = 300;

export const metadata: Metadata = homePageMetadata;

const GuestHomePage = () => null;

export default GuestHomePage;
