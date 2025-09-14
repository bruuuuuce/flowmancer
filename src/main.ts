import { createApp } from 'vue'
import App from './ui/App.vue'
import './styles/themes.css'
import './styles/overlays.css'
import './styles/console-improvements.css'
import { useTheme } from './composables/useTheme'

document.title = 'Flowmancer - Master the Flow';

const { currentTheme } = useTheme()
console.log('🧙‍♂️ Flowmancer initialized with theme:', currentTheme.value)

createApp(App).mount('#app')
