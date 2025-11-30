import './StadiumBackground.css';

export default function StadiumBackground() {
  return (
    <div className="stadium-background">
      <div
        className="stadium-background__image"
        style={{ backgroundImage: `url(https://images.unsplash.com/photo-1486286701208-1d58e9338013?w=1920&q=80)` }}
      />
      <div className="stadium-background__fade" />
    </div>
  );
}
