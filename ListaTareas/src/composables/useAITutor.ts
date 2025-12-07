/**
 * Composable para el Tutor con IA
 * Proporciona funciones para interactuar con el AI Tutor
 */

import { ref } from 'vue';
import { supabase } from '@/lib/supabase';

export interface FlashCard {
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface StudyResource {
  type: 'video' | 'article' | 'course' | 'tool';
  title: string;
  url: string;
  description: string;
  duration?: string;
}

export interface StudyPlan {
  technique: string;
  description: string;
  steps: string[];
  duration: string;
}

export interface TutorResponse {
  success: boolean;
  action: string;
  content?: {
    explanation?: string;
    tips?: string[];
    resources?: StudyResource[];
    flashcards?: FlashCard[];
    study_plan?: StudyPlan;
    audio_url?: string;
  };
  error?: string;
}

export function useAITutor() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Llama a la Edge Function del AI Tutor
   */
  async function callTutor(
    todoId: string,
    action: 'explain' | 'tips' | 'resources' | 'flashcards' | 'study_techniques' | 'audio',
    customQuery?: string
  ): Promise<TutorResponse | null> {
    loading.value = true;
    error.value = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const response = await supabase.functions.invoke('TutorIa', {
        body: {
          todo_id: todoId,
          user_id: user.id,
          action: action,
          custom_query: customQuery
        }
      });

      if (response.error) {
        throw response.error;
      }

      return response.data as TutorResponse;
    } catch (err: any) {
      error.value = err.message || 'Error al conectar con el tutor IA';
      console.error('AI Tutor error:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Obtiene explicación conceptual de la tarea
   */
  async function explainConcept(todoId: string) {
    return await callTutor(todoId, 'explain');
  }

  /**
   * Obtiene tips de estudio personalizados
   */
  async function getStudyTips(todoId: string) {
    return await callTutor(todoId, 'tips');
  }

  /**
   * Obtiene recursos educativos sugeridos
   */
  async function getResources(todoId: string) {
    return await callTutor(todoId, 'resources');
  }

  /**
   * Genera flashcards para memorización
   */
  async function generateFlashcards(todoId: string) {
    return await callTutor(todoId, 'flashcards');
  }

  /**
   * Obtiene técnicas de estudio recomendadas
   */
  async function getStudyTechniques(todoId: string) {
    return await callTutor(todoId, 'study_techniques');
  }

  /**
   * Genera audio de texto personalizado
   */
  async function generateAudio(todoId: string, text: string) {
    return await callTutor(todoId, 'audio', text);
  }

  /**
   * Reproduce audio desde data URL
   */
  function playAudio(audioUrl: string) {
    if (!audioUrl) return;
    
    const audio = new Audio(audioUrl);
    audio.play().catch(err => {
      console.error('Error playing audio:', err);
      error.value = 'No se pudo reproducir el audio';
    });
  }

  return {
    loading,
    error,
    explainConcept,
    getStudyTips,
    getResources,
    generateFlashcards,
    getStudyTechniques,
    generateAudio,
    playAudio
  };
}
