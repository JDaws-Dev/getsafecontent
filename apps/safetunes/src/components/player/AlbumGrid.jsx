function AlbumGrid({ albums, onSelectAlbum }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Albums</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {albums.map((album) => (
          <div
            key={album._id || album.appleAlbumId}
            onClick={() => onSelectAlbum(album)}
            className="group cursor-pointer"
          >
            <div className={`aspect-square mb-3 rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-all bg-gradient-to-br ${album.color || album.artworkUrl ? '' : 'from-gray-300 to-gray-400'} group-hover:scale-105 duration-300 flex items-center justify-center`}>
              {album.artworkUrl ? (
                <img
                  src={album.artworkUrl.replace('{w}', '300').replace('{h}', '300')}
                  alt={album.albumName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${album.color || 'from-purple-400 to-pink-400'}`} />
              )}
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">
              {album.albumName || album.name}
            </h3>
            <p className="text-gray-600 text-xs line-clamp-1">{album.artistName || album.artist}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AlbumGrid;
