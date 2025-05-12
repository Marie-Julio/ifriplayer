import './VideoPlayer.css'

const VideoPlayer = ({ src, controls = true, width = '100%' }) => {
  return (
    <div className="video-container">
      <video
        src={src}
        controls={controls}
        style={{ width }}
      />
    </div>
  )
}

export default VideoPlayer