import { FeatureGrid } from "./FeatureGrid";
import { Footer } from "./Footer";
import { Hero } from "./Hero";
import { Nav } from "./Nav";

export function LandingView() {
	return (
		<div className="landing-shell min-h-screen">
			<Nav />
			<main>
				<Hero />
				<FeatureGrid />
			</main>
			<Footer />
		</div>
	);
}
