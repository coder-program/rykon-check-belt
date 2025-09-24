import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FaceRecognitionController, PresencasFaceController } from './face-recognition.controller';
import { FaceRecognitionService } from './face-recognition.service';
import { FaceEmbedding } from './entities/face-embedding.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([FaceEmbedding]),
  ],
  controllers: [FaceRecognitionController, PresencasFaceController],
  providers: [FaceRecognitionService],
  exports: [FaceRecognitionService],
})
export class FaceRecognitionModule {}