import AVFoundation

struct SongUploadService {
    func readAudio(from url: URL) throws -> AVAudioFile {
        _ = url.startAccessingSecurityScopedResource()
        return try AVAudioFile(forReading: url)
    }
}
