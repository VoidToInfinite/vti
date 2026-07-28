import { Navbar } from "@/components/layout/Navbar/Navbar";
import { Hero } from "@/components/sections/Hero/Hero";
import { HomeSections } from "@/components/sections/HomeSections";
import { Footer } from "@/components/layout/Footer/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <HomeSections />
      </main>
      <Footer />
    </>
  );
}
