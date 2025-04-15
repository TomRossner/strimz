const LOADING_PHRASES = [
    "Grabbing the popcorn... hang tight!",
    "Loading... because even blockbusters need a moment.",
    "Rewinding time... please stand by.",
    "Just bribing the projectionist...",
    "Summoning cinematic magic...",
    "Rendering drama, comedy, and explosions...",
    "Almost there. Plot twists take time.",
    "Warming up the red carpet...",
    "Buffering brilliance… hold your popcorn!",
    "Hold on… the movie stars are still getting into costume.",
    "Loading magic... CGI takes a second, okay?",
    "Don’t worry, no cliffhangers here—almost done!",
    "Loading... because binge-watching requires patience.",
    "Preparing a cinematic experience that’s worth the wait.",
    "Cue dramatic music… loading scene in progress.",
    "Still faster than a DVD menu from 2005.",
    "Serving up pixels and plot twists…",
    "Hang on... we're untangling some film reels."
]

export const getRandomPhrase = () => {
    const index = Math.floor(Math.random() * LOADING_PHRASES.length);

    return LOADING_PHRASES[index];
}