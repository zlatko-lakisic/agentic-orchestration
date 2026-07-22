import { AboutTheBuilder } from './components/AboutTheBuilder'
import { BuildLogQuote } from './components/BuildLogQuote'
import { Footer } from './components/Footer'
import { GoDeeper } from './components/GoDeeper'
import { Hero } from './components/Hero'
import { HowItWorks } from './components/HowItWorks'
import { OneRealRun } from './components/OneRealRun'
import { SkipLink } from './components/SkipLink'
import { Verticals } from './components/Verticals'
import { WhoThisIsFor } from './components/WhoThisIsFor'
import { WhyItMatters } from './components/WhyItMatters'

export default function App() {
  return (
    <>
      <SkipLink />
      <Hero />
      <main id="main-content">
        <OneRealRun />
        <WhyItMatters />
        <WhoThisIsFor />
        <Verticals />
        <HowItWorks />
        <BuildLogQuote />
        <AboutTheBuilder />
        <GoDeeper />
      </main>
      <Footer />
    </>
  )
}
