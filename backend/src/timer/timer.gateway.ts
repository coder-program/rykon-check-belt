import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { TimerService } from './timer.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/timer',
})
export class TimerGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server = null as any;

  private readonly logger = new Logger(TimerGateway.name);

  constructor(private readonly timerService: TimerService) {}

  afterInit(server: Server) {
    this.timerService.setSocketServer(server);
    this.logger.log('Timer WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /** TV pública entra na sala do timer da academia */
  @SubscribeMessage('joinTimerRoom')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { academyId: string; role?: string },
  ) {
    const { academyId, role } = data;
    const room = role === 'admin' ? `academy:${academyId}` : `tv:${academyId}`;
    client.join(room);
    // Also join tv room always so TV receives broadcasts
    client.join(`tv:${academyId}`);

    // Send current state on join
    const state = this.timerService.getState(academyId);
    if (state) {
      client.emit('timer:state', state);
    }
    this.logger.log(`Client ${client.id} joined room ${room}`);
    return { success: true, room };
  }

  /** Controle: iniciar timer */
  @SubscribeMessage('timer:start')
  async handleStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { configId: string; academyId: string },
  ) {
    try {
      const state = await this.timerService.startTimer(data.configId, data.academyId);
      return { success: true, state };
    } catch (err) {
      return { success: false, error: (err as any)?.message ?? 'Erro' };
    }
  }

  /** Controle: pausar timer */
  @SubscribeMessage('timer:pause')
  handlePause(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { academyId: string },
  ) {
    const state = this.timerService.pauseTimer(data.academyId);
    return { success: true, state };
  }

  /** Controle: retomar timer */
  @SubscribeMessage('timer:resume')
  handleResume(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { academyId: string },
  ) {
    const state = this.timerService.resumeTimer(data.academyId);
    return { success: true, state };
  }

  /** Controle: resetar timer */
  @SubscribeMessage('timer:reset')
  handleReset(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { academyId: string },
  ) {
    const state = this.timerService.resetTimer(data.academyId);
    return { success: true, state };
  }
}
