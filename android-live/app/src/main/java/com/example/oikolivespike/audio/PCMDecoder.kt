package com.example.oikolivespike.audio

import android.content.Context
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.net.Uri
import android.util.Log
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * PCMDecoder usa a API de MediaCodec/MediaExtractor nativa do Android para
 * decodificar qualquer formato de áudio suportado pelo sistema (WAV, MP3, AAC)
 * para um FloatArray bruto contendo amostras PCM (48kHz, mono ou estéreo).
 */
class PCMDecoder(private val context: Context) {

    companion object {
        private const val TAG = "PCMDecoder"
        private const val TARGET_SAMPLE_RATE = 48000
    }

    class DecodedAudio(
        val pcmData: FloatArray,
        val sampleRate: Int,
        val channels: Int
    )

    fun decodeFile(uri: Uri): DecodedAudio? {
        val extractor = MediaExtractor()
        var codec: MediaCodec? = null
        try {
            // Configura o extrator com a URI do arquivo
            context.contentResolver.openFileDescriptor(uri, "r")?.use { pfd ->
                extractor.setDataSource(pfd.fileDescriptor)
            } ?: run {
                extractor.setDataSource(context, uri, null)
            }

            // Acha a track de áudio
            var trackIndex = -1
            var format: MediaFormat? = null
            for (i in 0 until extractor.trackCount) {
                val f = extractor.getTrackFormat(i)
                val mime = f.getString(MediaFormat.KEY_MIME) ?: ""
                if (mime.startsWith("audio/")) {
                    trackIndex = i
                    format = f
                    break
                }
            }

            if (trackIndex < 0 || format == null) {
                Log.e(TAG, "Nenhuma track de áudio encontrada no arquivo.")
                return null
            }

            extractor.selectTrack(trackIndex)

            val mime = format.getString(MediaFormat.KEY_MIME)!!
            val codecName = MediaCodecListHelper.findDecoderForMime(mime)
            val activeCodec = MediaCodec.createByCodecName(codecName)
            codec = activeCodec
            
            // Garante que a saída do decoder seja PCM de 16 bits (será convertida para Float posteriormente)
            format.setInteger(MediaFormat.KEY_PCM_ENCODING, android.media.AudioFormat.ENCODING_PCM_16BIT)
            activeCodec.configure(format, null, null, 0)
            activeCodec.start()

            val originalSampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            val channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)

            Log.i(TAG, "Decodificando: rate=$originalSampleRate, canais=$channels, formato=$mime")

            val byteBufferList = mutableListOf<ByteArray>()
            var totalBytes = 0

            val info = MediaCodec.BufferInfo()
            var isInputEOS = false
            var isOutputEOS = false

            while (!isOutputEOS) {
                if (!isInputEOS) {
                    val inputBufferIndex = activeCodec.dequeueInputBuffer(10000)
                    if (inputBufferIndex >= 0) {
                        val inputBuffer = activeCodec.getInputBuffer(inputBufferIndex)!!
                        val sampleSize = extractor.readSampleData(inputBuffer, 0)
                        if (sampleSize < 0) {
                            activeCodec.queueInputBuffer(inputBufferIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                            isInputEOS = true
                        } else {
                            val presentationTimeUs = extractor.sampleTime
                            activeCodec.queueInputBuffer(inputBufferIndex, 0, sampleSize, presentationTimeUs, 0)
                            extractor.advance()
                        }
                    }
                }

                val outputBufferIndex = activeCodec.dequeueOutputBuffer(info, 10000)
                if (outputBufferIndex >= 0) {
                    val outputBuffer = activeCodec.getOutputBuffer(outputBufferIndex)!!
                    
                    if (info.size > 0) {
                        val chunk = ByteArray(info.size)
                        outputBuffer.position(info.offset)
                        outputBuffer.get(chunk)
                        byteBufferList.add(chunk)
                        totalBytes += info.size
                    }

                    activeCodec.releaseOutputBuffer(outputBufferIndex, false)

                    if ((info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
                        isOutputEOS = true
                    }
                }
            }

            // Concatena todos os chunks de ByteArray PCM 16-bit
            val fullBuffer = ByteBuffer.allocate(totalBytes)
            fullBuffer.order(ByteOrder.LITTLE_ENDIAN)
            for (chunk in byteBufferList) {
                fullBuffer.put(chunk)
            }
            fullBuffer.flip()

            // Converte PCM 16-bit (Shorts) para FloatArray (-1.0f a 1.0f)
            val shortBuffer = fullBuffer.asShortBuffer()
            val samplesCount = shortBuffer.remaining()
            val floatData = FloatArray(samplesCount)

            for (i in 0 until samplesCount) {
                val sampleShort = shortBuffer.get()
                // Normaliza de Short para Float
                floatData[i] = sampleShort.toFloat() / 32768.0f
            }

            // TODO: Adicionar Resampler se originalSampleRate != TARGET_SAMPLE_RATE (48kHz)
            // Para o Spike e MVPs iniciais de louvor, assumiremos que as VSs/Multitracks já são geradas
            // por padrão em 44.1kHz ou 48kHz (o que é o padrão de mercado em stems).

            return DecodedAudio(
                pcmData = floatData,
                sampleRate = originalSampleRate,
                channels = channels
            )

        } catch (e: Exception) {
            Log.e(TAG, "Erro durante decodificação de áudio: ${e.message}", e)
            return null
        } finally {
            try {
                codec?.stop()
                codec?.release()
            } catch (e: Exception) {}
            extractor.release()
        }
    }
}

// Auxiliar para encontrar codecs de decodificação seguros no Android
object MediaCodecListHelper {
    fun findDecoderForMime(mime: String): String {
        val list = android.media.MediaCodecList(android.media.MediaCodecList.REGULAR_CODECS)
        for (info in list.codecInfos) {
            if (info.isEncoder) continue
            try {
                val caps = info.getCapabilitiesForType(mime)
                if (caps != null) {
                    return info.name
                }
            } catch (e: Exception) {}
        }
        return mime // Fallback se falhar
    }
}
