import { AboutTheBuilder } from './components/AboutTheBuilder'
import { BuildLogQuote } from './components/BuildLogQuote'
import { Footer } from './components/Footer'
import { FourParts } from './components/FourParts'
import { GoDeeper } from './components/GoDeeper'
import { Hero } from './components/Hero'
import { LoopContrast } from './components/LoopContrast'
import { OneRealRun } from './components/OneRealRun'
import { SkipLink } from './components/SkipLink'
import { TheIdea } from './components/TheIdea'
import { Verticals } from './components/Verticals'
import { WhoThisIsFor } from './components/WhoThisIsFor'

export default function App() {
  return (
    <>
      <SkipLink />
      <Hero />
      <main id="main-content">
        <TheIdea />
        <OneRealRun />
        <LoopContrast />
        <FourParts />
        <Verticals />
        <BuildLogQuote />
        <WhoThisIsFor />
        <AboutTheBuilder />
        <GoDeeper />
      </main>
      <Footer />
    </>
  )
}
