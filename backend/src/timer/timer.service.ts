import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimerConfig, TimerMode, CircuitExercise } from './entities/timer-config.entity';
import { CreateTimerDto } from './dto/create-timer.dto';
import { Server } from 'socket.io';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface TimerState {
  configId: string;
  academyId: string;
  mode: TimerMode;
  nome: string;
  status: TimerStatus;
  timeRemaining: number;
  currentRound: number;
  totalRounds: number;
  isResting: boolean;
  exercicioAtual: string;
  exercicioIndex: number;
  config: Omit<TimerConfig, 'created_at' | 'updated_at'>;
}

@Injectable()
export class TimerService {
  private states = new Map<string, TimerState & { intervalId?: NodeJS.Timeout }>();
  private socketServer: Server | null = null;

  constructor(
    @InjectRepository(TimerConfig)
    private timerConfigRepository: Repository<TimerConfig>,
  ) {}

  setSocketServer(server: Server) {
    this.socketServer = server;
  }

  // ──────────────── CRUD ────────────────

  async create(dto: CreateTimerDto): Promise<TimerConfig> {
    const config = this.timerConfigRepository.create({
      ...dto,
      duracaoSegundos: dto.duracaoSegundos ?? 300,
      numRounds: dto.numRounds ?? 3,
      duracaoRoundSegundos: dto.duracaoRoundSegundos ?? 300,
      duracaoDescansoSegundos: dto.duracaoDescansoSegundos ?? 60,
      ativo: dto.ativo ?? true,
    });
    return this.timerConfigRepository.save(config);
  }

  async findAll(academiaId?: string): Promise<TimerConfig[]> {
    const where: any = { ativo: true };
    if (academiaId) where.academiaId = academiaId;
    return this.timerConfigRepository.find({ where });
  }

  async findOne(id: string): Promise<TimerConfig> {
    const config = await this.timerConfigRepository.findOne({ where: { id } });
    if (!config) throw new NotFoundException(`Timer config ${id} não encontrado`);
    return config;
  }

  async update(id: string, dto: Partial<CreateTimerDto>): Promise<TimerConfig> {
    await this.timerConfigRepository.update(id, dto as any);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.timerConfigRepository.update(id, { ativo: false });
  }

  // ──────────────── State ────────────────

  getState(academyId: string): Omit<TimerState, never> | null {
    const state = this.states.get(academyId);
    if (!state) return null;
    return this.serializeState(state);
  }

  // ──────────────── Controls ────────────────

  async startTimer(configId: string, academyId: string): Promise<TimerState> {
    const config = await this.findOne(configId);
    this.stopInterval(academyId);

    const state = this.buildInitialState(config, academyId);
    state.status = 'running';
    this.states.set(academyId, state);
    this.startInterval(academyId);
    this.broadcast(academyId, state);
    return this.serializeState(state);
  }

  pauseTimer(academyId: string): TimerState | null {
    const state = this.states.get(academyId);
    if (!state || state.status !== 'running') return null;
    state.status = 'paused';
    this.stopInterval(academyId);
    this.broadcast(academyId, state);
    return this.serializeState(state);
  }

  resumeTimer(academyId: string): TimerState | null {
    const state = this.states.get(academyId);
    if (!state || state.status !== 'paused') return null;
    state.status = 'running';
    this.startInterval(academyId);
    this.broadcast(academyId, state);
    return this.serializeState(state);
  }

  resetTimer(academyId: string): TimerState | null {
    const state = this.states.get(academyId);
    if (!state) return null;
    this.stopInterval(academyId);
    const fresh = this.buildInitialState(state.config as TimerConfig, academyId);
    this.states.set(academyId, fresh);
    this.broadcast(academyId, fresh);
    return this.serializeState(fresh);
  }

  // ──────────────── Internal ────────────────

  private buildInitialState(
    config: TimerConfig,
    academyId: string,
  ): TimerState & { intervalId?: NodeJS.Timeout } {
    const firstExercise: CircuitExercise | undefined = config.exercicios?.[0];
    const total =
      config.modo === TimerMode.ROUNDS
        ? config.numRounds
        : config.exercicios?.length ?? 1;

    const timeRemaining =
      config.modo === TimerMode.SIMPLE
        ? config.duracaoSegundos
        : config.modo === TimerMode.ROUNDS
        ? config.duracaoRoundSegundos
        : firstExercise?.duracaoSegundos ?? 60;

    return {
      configId: config.id,
      academyId,
      mode: config.modo,
      nome: config.nome,
      status: 'idle',
      timeRemaining,
      currentRound: 1,
      totalRounds: total,
      isResting: false,
      exercicioAtual: firstExercise?.nome ?? '',
      exercicioIndex: 0,
      config: config as any,
    };
  }

  private startInterval(academyId: string) {
    const id = setInterval(() => this.tick(academyId), 1000);
    const state = this.states.get(academyId);
    if (state) state.intervalId = id;
  }

  private stopInterval(academyId: string) {
    const state = this.states.get(academyId);
    if (state?.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = undefined;
    }
  }

  private tick(academyId: string) {
    const state = this.states.get(academyId);
    if (!state || state.status !== 'running') return;

    state.timeRemaining = Math.max(0, state.timeRemaining - 1);

    if (state.timeRemaining === 0) {
      this.onPhaseEnd(academyId, state);
    } else {
      this.broadcast(academyId, state);
    }
  }

  private onPhaseEnd(
    academyId: string,
    state: TimerState & { intervalId?: NodeJS.Timeout },
  ) {
    const { config } = state;

    if (state.mode === TimerMode.SIMPLE) {
      state.status = 'finished';
      this.stopInterval(academyId);
      this.broadcast(academyId, state);
      return;
    }

    if (state.mode === TimerMode.ROUNDS) {
      if (!state.isResting) {
        if (state.currentRound >= state.totalRounds) {
          state.status = 'finished';
          this.stopInterval(academyId);
          this.broadcast(academyId, state);
          return;
        }
        // Start rest
        state.isResting = true;
        state.timeRemaining = (config as TimerConfig).duracaoDescansoSegundos;
      } else {
        // Rest over → next round
        state.isResting = false;
        state.currentRound++;
        state.timeRemaining = (config as TimerConfig).duracaoRoundSegundos;
      }
      this.broadcast(academyId, state);
      return;
    }

    if (state.mode === TimerMode.CIRCUIT) {
      const exercicios = (config as TimerConfig).exercicios ?? [];
      const currentEx = exercicios[state.exercicioIndex];

      if (!state.isResting && currentEx && currentEx.descansoSegundos > 0) {
        // Exercise done → rest
        state.isResting = true;
        state.timeRemaining = currentEx.descansoSegundos;
        this.broadcast(academyId, state);
        return;
      }

      // Move to next exercise
      const nextIdx = state.exercicioIndex + 1;
      if (nextIdx >= exercicios.length) {
        state.status = 'finished';
        this.stopInterval(academyId);
        this.broadcast(academyId, state);
        return;
      }
      state.isResting = false;
      state.exercicioIndex = nextIdx;
      state.exercicioAtual = exercicios[nextIdx].nome;
      state.currentRound = nextIdx + 1;
      state.timeRemaining = exercicios[nextIdx].duracaoSegundos;
      this.broadcast(academyId, state);
    }
  }

  private broadcast(
    academyId: string,
    state: TimerState & { intervalId?: NodeJS.Timeout },
  ) {
    if (!this.socketServer) return;
    const data = this.serializeState(state);
    this.socketServer.to(`academy:${academyId}`).emit('timer:state', data);
    // Also broadcast to public TV room
    this.socketServer.to(`tv:${academyId}`).emit('timer:state', data);
  }

  private serializeState(
    state: TimerState & { intervalId?: NodeJS.Timeout },
  ): TimerState {
    const { intervalId, ...rest } = state as any;
    return rest;
  }
}
