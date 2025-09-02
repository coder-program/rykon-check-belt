import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  isLoading: boolean;
  isInAcademy: boolean | null;
}

interface AcademyLocation {
  latitude: number;
  longitude: number;
  radius: number; // em metros
  name: string;
}

// Coordenadas das academias TeamCruz
const ACADEMY_LOCATIONS: AcademyLocation[] = [
  {
    name: 'TeamCruz CT - Matriz',
    latitude: -23.5505, // Exemplo: São Paulo
    longitude: -46.6333,
    radius: 100, // 100 metros de raio
  },
  {
    name: 'TeamCruz Unidade 2',
    latitude: -23.5605,
    longitude: -46.6433,
    radius: 100,
  },
  // Adicionar mais unidades conforme necessário
];

// Função para calcular distância entre dois pontos (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distância em metros
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    isLoading: false,
    isInAcademy: null,
  });

  const checkIfInAcademy = useCallback((lat: number, lon: number): { isInside: boolean; academy?: AcademyLocation; distance?: number } => {
    for (const academy of ACADEMY_LOCATIONS) {
      const distance = calculateDistance(lat, lon, academy.latitude, academy.longitude);
      if (distance <= academy.radius) {
        return { isInside: true, academy, distance };
      }
    }
    
    // Retorna a academia mais próxima mesmo se não estiver dentro do raio
    const distances = ACADEMY_LOCATIONS.map(academy => ({
      academy,
      distance: calculateDistance(lat, lon, academy.latitude, academy.longitude)
    }));
    
    const closest = distances.reduce((prev, curr) => 
      prev.distance < curr.distance ? prev : curr
    );
    
    return { isInside: false, academy: closest.academy, distance: closest.distance };
  }, []);

  const getCurrentPosition = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocalização não suportada pelo navegador',
        isLoading: false,
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const locationCheck = checkIfInAcademy(latitude, longitude);
        
        setState({
          latitude,
          longitude,
          accuracy,
          error: null,
          isLoading: false,
          isInAcademy: locationCheck.isInside,
        });

        // Salva a última localização e resultado no localStorage
        localStorage.setItem('lastLocation', JSON.stringify({
          latitude,
          longitude,
          accuracy,
          timestamp: Date.now(),
          isInAcademy: locationCheck.isInside,
          academy: locationCheck.academy?.name,
          distance: locationCheck.distance,
        }));
      },
      (error) => {
        let errorMessage = 'Erro ao obter localização';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permissão de localização negada. Por favor, habilite a localização nas configurações.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Localização indisponível. Verifique se o GPS está ativado.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tempo esgotado ao obter localização.';
            break;
        }
        
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [checkIfInAcademy]);

  // Função para validar check-in com base na localização
  const validateCheckinLocation = useCallback((): { valid: boolean; message: string; requireConfirmation?: boolean } => {
    // Em desenvolvimento, permite check-in com confirmação
    if (process.env.NODE_ENV === 'development') {
      return {
        valid: true,
        message: 'Modo desenvolvimento: Check-in permitido sem validação de localização',
        requireConfirmation: false,
      };
    }

    // Se não há localização disponível
    if (state.latitude === null || state.longitude === null) {
      return {
        valid: false,
        message: 'Por favor, ative a localização para fazer check-in',
        requireConfirmation: false,
      };
    }

    // Se está dentro da academia
    if (state.isInAcademy) {
      return {
        valid: true,
        message: 'Localização confirmada dentro da academia',
        requireConfirmation: false,
      };
    }

    // Se está fora da academia, permite com confirmação do instrutor
    const lastLocation = localStorage.getItem('lastLocation');
    if (lastLocation) {
      const { academy, distance } = JSON.parse(lastLocation);
      return {
        valid: false,
        message: `Você está a ${Math.round(distance || 0)}m da ${academy || 'academia mais próxima'}. Check-in requer autorização do instrutor.`,
        requireConfirmation: true,
      };
    }

    return {
      valid: false,
      message: 'Você precisa estar dentro da academia para fazer check-in',
      requireConfirmation: true,
    };
  }, [state]);

  // Monitora mudanças de localização
  useEffect(() => {
    let watchId: number;

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const locationCheck = checkIfInAcademy(latitude, longitude);
          
          setState(prev => ({
            ...prev,
            latitude,
            longitude,
            accuracy,
            isInAcademy: locationCheck.isInside,
          }));
        },
        undefined,
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 30000,
        }
      );
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [checkIfInAcademy]);

  return {
    ...state,
    getCurrentPosition,
    validateCheckinLocation,
    academyLocations: ACADEMY_LOCATIONS,
  };
}
