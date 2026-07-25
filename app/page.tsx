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
        {/* `About` es contenido preexistente, ajeno a las 4 escenas del viaje.
            Va ANTES de `Contact` porque el arco del spec (vacío → foco →
            sistema → invitación) exige que la invitación cierre: dejar un
            bloque "Acerca de" después diluye justo el efecto de cierre que
            esa escena existe para producir. */}
        <About />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
