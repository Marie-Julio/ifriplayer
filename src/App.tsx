import MultiVideoPlayer from './components/MultiVideoPlayer/MultiVideoPlayer'

const demoVideos = [
  {
    id: '1',
    likes: 45,
    dislikes: 7,
    title: 'Exemple vidéo',
    file_path: './video1.mp4',
    thumbnail: 'thumbnails/sample.jpg',
    downloadable: true
  },
  {
    id: '2',
    likes: 201,
    dislikes: 19,
    title: 'Exemple vidéo2',
    file_path: './video2.mp4',
    thumbnail: 'thumbnails/sample.jpg',
    downloadable: false
  }
]

function App() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <MultiVideoPlayer 
        videos={demoVideos} 
        initialVideoIndex={0}
      />
    </div>
  )
}

export default App