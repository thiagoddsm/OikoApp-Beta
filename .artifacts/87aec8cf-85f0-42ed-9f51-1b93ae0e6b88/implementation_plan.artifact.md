# Plano de Implementação: TheoFlix Android Official

Criação de um novo projeto Android nativo exclusivo para o módulo de ensino **TheoFlix**, utilizando as tecnologias mais modernas e integrando com o ecossistema existente da Oiko.

## User Review Required

> [!IMPORTANT]
> O projeto será criado em uma nova pasta `theoflix-android`.
> Utilizaremos o pacote `com.oiko.theoflix`. Se você tiver um nome de pacote específico em mente para a Play Store, por favor me avise.

> [!TIP]
> O app será configurado com o tema "Dark Mode" por padrão, seguindo a estética de plataformas de streaming.

## Open Questions

1. Você já possui um arquivo `google-services.json` para este novo pacote (`com.oiko.theoflix`) ou gostaria que eu usasse o existente do `OikoLiveSpike` por enquanto?
2. Deseja que o login seja obrigatório logo ao abrir o app ou quer uma tela de "Degustação" (Browse sem login)?

## Mudanças Propostas

### [Core] Estrutura do Projeto

Criaremos a fundação do projeto com Gradle (Kotlin DSL) e as dependências necessárias.

#### [NEW] [build.gradle.kts (Root)](file:///C:/Users/user/.gemini/antigravity/scratch/OikoApp-Beta/theoflix-android/build.gradle.kts)
Configuração dos plugins do Android, Kotlin e Google Services.

#### [NEW] [build.gradle.kts (App)](file:///C:/Users/user/.gemini/antigravity/scratch/OikoApp-Beta/theoflix-android/app/build.gradle.kts)
Dependências do Jetpack Compose, Firebase (Auth/Firestore) e YouTube Player.

### [Data] Camada de Dados

Mapeamento dos dados do Firestore para o Kotlin.

#### [NEW] [TheoflixModels.kt](file:///C:/Users/user/.gemini/antigravity/scratch/OikoApp-Beta/theoflix-android/app/src/main/java/com/oiko/theoflix/data/models/TheoflixModels.kt)
Modelos para `Course`, `Episode` e `Level`.

#### [NEW] [TheoflixRepository.kt](file:///C:/Users/user/.gemini/antigravity/scratch/OikoApp-Beta/theoflix-android/app/src/main/java/com/oiko/theoflix/data/repository/TheoflixRepository.kt)
Gerenciamento de chamadas ao Firebase para buscar cursos e salvar progresso.

### [UI] Interface e Navegação

Implementação das telas principais em Jetpack Compose.

#### [NEW] [NavGraph.kt](file:///C:/Users/user/.gemini/antigravity/scratch/OikoApp-Beta/theoflix-android/app/src/main/java/com/oiko/theoflix/ui/navigation/NavGraph.kt)
Fluxo: Splash -> Login -> Home -> Detalhes do Curso -> Player.

#### [NEW] [HomeScreen.kt](file:///C:/Users/user/.gemini/antigravity/scratch/OikoApp-Beta/theoflix-android/app/src/main/java/com/oiko/theoflix/ui/screens/home/HomeScreen.kt)
Interface estilo Netflix com carrosséis horizontais por níveis.

#### [NEW] [CourseDetailScreen.kt](file:///C:/Users/user/.gemini/antigravity/scratch/OikoApp-Beta/theoflix-android/app/src/main/java/com/oiko/theoflix/ui/screens/details/CourseDetailScreen.kt)
Lista de aulas, progresso e botão para iniciar o player.

## Plano de Verificação

### Testes Automatizados
- Unit Tests para o `TheoflixRepository` para validar o mapeamento do Firestore.
- Build test para garantir que a estrutura Gradle está correta.

### Verificação Manual
- Deploy no dispositivo para validar a fluidez da navegação e o carregamento das imagens de capa.
