import { Navbar } from "@/components/layout/Navbar/Navbar";
import { Hero } from "@/components/sections/Hero/Hero";
import { Story } from "@/components/sections/Story/Story";
import { Features } from "@/components/sections/Features/Features";
import { Contact } from "@/components/sections/Contact/Contact";
import { About } from "@/components/sections/About/About";
import { Footer } from "@/components/layout/Footer/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Story />
        <Features />
        <Contact />
        <About />
      </main>
      <Footer />
    </>
  );
}
