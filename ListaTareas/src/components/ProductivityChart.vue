<template>
  <div class="productivity-chart">
    <div class="header">
      <h3>Análisis de Productividad</h3>
      <button @click="analyze" :disabled="isAnalyzing" class="analyze-btn">
        <svg v-if="!isAnalyzing" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span v-else class="spinner"></span>
        {{ isAnalyzing ? 'Analizando...' : 'Analizar' }}
      </button>
    </div>

    <div v-if="error" class="error-message">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {{ error }}
    </div>

    <div v-if="insights" class="insights-container">
      <!-- Métricas principales -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon completion">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="metric-value">{{ insights.completionRate }}%</div>
          <div class="metric-label">Tasa de completado</div>
        </div>

        <div class="metric-card">
          <div class="metric-icon time">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="metric-value">{{ insights.averageTimeToComplete }}</div>
          <div class="metric-label">Días promedio</div>
        </div>
      </div>

      <!-- Momento más productivo -->
      <div class="insight-card">
        <h4>🌟 Momento más productivo</h4>
        <p>{{ insights.mostProductiveTime }}</p>
      </div>

      <!-- Distribución por prioridad -->
      <div class="insight-card">
        <h4>📊 Tareas por prioridad</h4>
        <div class="priority-bars">
          <div class="priority-bar urgent">
            <span class="label">Urgente</span>
            <div class="bar-container">
              <div class="bar-fill" :style="{ width: getPriorityPercentage('urgent') + '%' }"></div>
              <span class="count">{{ insights.tasksByPriority.urgent }}</span>
            </div>
          </div>
          <div class="priority-bar high">
            <span class="label">Alta</span>
            <div class="bar-container">
              <div class="bar-fill" :style="{ width: getPriorityPercentage('high') + '%' }"></div>
              <span class="count">{{ insights.tasksByPriority.high }}</span>
            </div>
          </div>
          <div class="priority-bar medium">
            <span class="label">Media</span>
            <div class="bar-container">
              <div class="bar-fill" :style="{ width: getPriorityPercentage('medium') + '%' }"></div>
              <span class="count">{{ insights.tasksByPriority.medium }}</span>
            </div>
          </div>
          <div class="priority-bar low">
            <span class="label">Baja</span>
            <div class="bar-container">
              <div class="bar-fill" :style="{ width: getPriorityPercentage('low') + '%' }"></div>
              <span class="count">{{ insights.tasksByPriority.low }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Sugerencias de IA -->
      <div class="insight-card">
        <h4>💡 Sugerencias</h4>
        <ul class="suggestions-list">
          <li v-for="(suggestion, index) in insights.suggestions" :key="index">
            {{ suggestion }}
          </li>
        </ul>
      </div>
    </div>

    <div v-else-if="!isAnalyzing" class="empty-state">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p>Haz clic en "Analizar" para obtener insights sobre tu productividad</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useProductivityAnalysis } from '../composables/useProductivityAnalysis'

const { insights, isAnalyzing, error, analyze } = useProductivityAnalysis()

const getPriorityPercentage = (priority: 'urgent' | 'high' | 'medium' | 'low') => {
  if (!insights.value) return 0
  const total = Object.values(insights.value.tasksByPriority).reduce((a: number, b: number) => a + b, 0)
  if (total === 0) return 0
  return (insights.value.tasksByPriority[priority] / total) * 100
}
</script>

<style scoped>
.productivity-chart {
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

.analyze-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #F06543 0%, #F09D51 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.analyze-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(240, 101, 67, 0.3);
}

.analyze-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.analyze-btn svg {
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
}

.error-message svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.insights-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.metric-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
}

.metric-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 0.75rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-icon svg {
  width: 28px;
  height: 28px;
  color: white;
}

.metric-icon.completion {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.metric-icon.time {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  color: #313638;
  margin-bottom: 0.25rem;
}

.metric-label {
  font-size: 0.875rem;
  color: #6c757d;
}

.insight-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 1.5rem;
}

.insight-card h4 {
  margin: 0 0 1rem;
  color: #313638;
  font-size: 1rem;
  font-weight: 600;
}

.insight-card p {
  margin: 0;
  color: #495057;
  line-height: 1.6;
}

.priority-bars {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.priority-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.priority-bar .label {
  min-width: 70px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #495057;
}

.bar-container {
  flex: 1;
  height: 32px;
  background: white;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #F06543 0%, #F09D51 100%);
  border-radius: 8px;
  transition: width 0.5s ease;
}

.priority-bar.urgent .bar-fill {
  background: linear-gradient(90deg, #e74c3c 0%, #c0392b 100%);
}

.priority-bar.high .bar-fill {
  background: linear-gradient(90deg, #F06543 0%, #F09D51 100%);
}

.priority-bar.medium .bar-fill {
  background: linear-gradient(90deg, #3498db 0%, #2980b9 100%);
}

.priority-bar.low .bar-fill {
  background: linear-gradient(90deg, #95a5a6 0%, #7f8c8d 100%);
}

.bar-container .count {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  font-weight: 600;
  color: #313638;
  font-size: 0.875rem;
}

.suggestions-list {
  margin: 0;
  padding-left: 1.5rem;
}

.suggestions-list li {
  color: #495057;
  line-height: 1.8;
  margin-bottom: 0.5rem;
}

.suggestions-list li:last-child {
  margin-bottom: 0;
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
