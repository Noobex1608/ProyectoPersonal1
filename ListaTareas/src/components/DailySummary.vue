<template>
  <div class="daily-summary">
    <div class="header">
      <h3>Resumen Diario</h3>
      <button @click="generate" :disabled="isGenerating" class="generate-btn">
        <svg v-if="!isGenerating" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span v-else class="spinner"></span>
        {{ isGenerating ? 'Generando...' : 'Generar Resumen' }}
      </button>
    </div>

    <div v-if="error" class="error-message">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {{ error }}
    </div>

    <div v-if="summary" class="summary-container">
      <!-- Fecha -->
      <div class="date-badge">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {{ formatDate(summary.date) }}
      </div>

      <!-- Estadísticas rápidas -->
      <div class="stats-grid">
        <div class="stat-card completed">
          <div class="stat-icon">✅</div>
          <div class="stat-value">{{ summary.completedCount }}</div>
          <div class="stat-label">Completadas</div>
        </div>
        <div class="stat-card pending">
          <div class="stat-icon">⏳</div>
          <div class="stat-value">{{ summary.pendingCount }}</div>
          <div class="stat-label">Pendientes</div>
        </div>
        <div class="stat-card overdue">
          <div class="stat-icon">⚠️</div>
          <div class="stat-value">{{ summary.overdueCount }}</div>
          <div class="stat-label">Atrasadas</div>
        </div>
      </div>

      <!-- Logros del día -->
      <div v-if="summary.highlights.length > 0" class="section-card highlights">
        <h4>🌟 Logros del día</h4>
        <ul>
          <li v-for="(highlight, index) in summary.highlights" :key="index">
            {{ highlight }}
          </li>
        </ul>
      </div>

      <!-- Recomendaciones -->
      <div v-if="summary.recommendations.length > 0" class="section-card recommendations">
        <h4>💡 Recomendaciones</h4>
        <ul>
          <li v-for="(rec, index) in summary.recommendations" :key="index">
            {{ rec }}
          </li>
        </ul>
      </div>

      <!-- Mensaje motivacional -->
      <div class="motivational-card">
        <div class="quote-icon">"</div>
        <p>{{ summary.motivationalMessage }}</p>
        <div class="motivational-footer">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          <span>¡Sigue así!</span>
        </div>
      </div>
    </div>

    <div v-else-if="!isGenerating" class="empty-state">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p>Genera un resumen de tu día con insights y motivación</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDailySummary } from '../composables/useDailySummary'

const { summary, isGenerating, error, generate } = useDailySummary()

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}
</script>

<style scoped>
.daily-summary {
  width: 100%;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.header h3 {
  margin: 0;
  color: #313638;
  font-size: 1.25rem;
  font-weight: 600;
}

.generate-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(79, 172, 254, 0.3);
}

.generate-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.generate-btn svg {
  width: 20px;
  height: 20px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  color: #c33;
  margin-bottom: 1.5rem;
}

.error-message svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.summary-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.date-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 50px;
  font-weight: 600;
  align-self: flex-start;
}

.date-badge svg {
  width: 20px;
  height: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  border-left: 4px solid;
}

.stat-card.completed {
  border-left-color: #38ef7d;
}

.stat-card.pending {
  border-left-color: #4facfe;
}

.stat-card.overdue {
  border-left-color: #f5576c;
}

.stat-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #313638;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #6c757d;
}

.section-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 1.5rem;
}

.section-card h4 {
  margin: 0 0 1rem;
  color: #313638;
  font-size: 1rem;
  font-weight: 600;
}

.section-card ul {
  margin: 0;
  padding-left: 1.5rem;
}

.section-card li {
  color: #495057;
  line-height: 1.8;
  margin-bottom: 0.5rem;
}

.section-card li:last-child {
  margin-bottom: 0;
}

.section-card.highlights {
  border-left: 4px solid #ffd700;
}

.section-card.recommendations {
  border-left: 4px solid #4facfe;
}

.motivational-card {
  background: linear-gradient(135deg, #F06543 0%, #F09D51 100%);
  border-radius: 16px;
  padding: 2rem;
  color: white;
  position: relative;
  overflow: hidden;
}

.quote-icon {
  font-size: 4rem;
  font-family: Georgia, serif;
  opacity: 0.2;
  position: absolute;
  top: -10px;
  left: 10px;
  line-height: 1;
}

.motivational-card p {
  margin: 0 0 1rem;
  font-size: 1.125rem;
  line-height: 1.6;
  position: relative;
  z-index: 1;
  font-style: italic;
}

.motivational-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  position: relative;
  z-index: 1;
}

.motivational-footer svg {
  width: 20px;
  height: 20px;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6c757d;
}

.empty-state svg {
  width: 64px;
  height: 64px;
  margin: 0 auto 1rem;
  color: #dee2e6;
}

.empty-state p {
  margin: 0;
  font-size: 1rem;
}
</style>
