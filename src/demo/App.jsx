import VideoPlayer from '../components/VideoPlayer'

function App() {
  return (
    <div style={{ width: '80%', margin: '0 auto' }}>
      <h1>Démo du lecteur vidéo</h1>
      <VideoPlayer src="/exemple.mp4" />
    </div>
  )
}

export default App