# Visão Geográfica - Análise de Dados do Paraná

Este é um projeto de Sistema de Informação Geográfica (SIG) para a web, criado para visualizar e analisar uma variedade de dados geoespaciais do estado do Paraná e da cidade de Curitiba. A aplicação apresenta um mapa interativo que permite a sobreposição de diferentes camadas de dados, como limites municipais, bairros, dados demográficos por setor censitário e registros de ocorrências.

## ✨ Funcionalidades Principais

* **Mapa Interativo:** Navegação fluida com zoom e panorâmica, utilizando OpenStreetMap e imagens de satélite como mapas base.
* **Múltiplas Camadas Temáticas:** Visualize camadas de dados complexos, incluindo:
    * População estimada dos municípios do Paraná.
    * Renda média mensal por setor censitário.
    * Taxa de alfabetização por setor censitário.
    * Limites dos bairros de Curitiba.
    * Contorno dos municípios do Paraná.
* **Visualização de Ocorrências:**
    * Dois conjuntos de dados de crimes georreferenciados, exibidos como clusters para melhor performance.
    * Filtros dinâmicos por período (manhã, tarde, noite) para ambos os conjuntos de dados.
    * Filtragem por tipo de ocorrência para os dados da Guarda Municipal.
* **Painel de Informações:** Clique em qualquer feição no mapa (município, bairro, setor) para exibir suas informações detalhadas em um painel lateral.
* **Ferramentas de Desenho e Análise:**
    * Desenhe polígonos, retângulos ou círculos diretamente no mapa.
    * Ao desenhar uma área, o sistema realiza uma análise espacial em tempo real, contando o número de ocorrências de cada fonte de dados dentro do perímetro desenhado.
* **Carregamento Eficiente de Dados:** Os dados geográficos são carregados dinamicamente com base na visualização atual do mapa (bounding box), garantindo uma experiência de usuário rápida e responsiva.
* **Legendas Dinâmicas:** Legendas claras e contextuais aparecem e desaparecem de acordo com a camada temática ativa.

## 🛠️ Tecnologias Utilizadas

Este projeto é dividido em duas partes principais: o *frontend* (a interface do mapa no navegador) e o *backend* (o servidor que fornece os dados).

### **Frontend**

* **HTML5** e **CSS3**
* **JavaScript**
* **Leaflet.js:** Biblioteca open-source para mapas interativos.
* **Leaflet.markercluster:** Plugin para agrupar marcadores em clusters.
* **Leaflet-groupedlayercontrol:** Plugin para um controle de camadas mais organizado.
* **Leaflet.draw:** Plugin para adicionar ferramentas de desenho ao mapa.

### **Backend**

* **Node.js:** Ambiente de execução para o servidor.
* **Express.js:** Framework para a criação da API.
* **PostgreSQL** com a extensão **PostGIS:** Banco de dados para armazenar e consultar dados geográficos de forma eficiente.
* **node-postgres (pg):** Cliente PostgreSQL para Node.js.
* **CORS:** Middleware para permitir requisições de origens diferentes.
* **dotenv:** Para gerenciar variáveis de ambiente.

## 🚀 Como Executar o Projeto Localmente

Para rodar este projeto, você precisará configurar o backend (API) e o frontend (cliente web).

### **Pré-requisitos**

* **Node.js e npm:** Essenciais para rodar o servidor backend.
* **PostgreSQL com PostGIS:** Necessário para armazenar e consultar os dados geográficos.
* **Dados:** Você precisará carregar os dados geoespaciais nas tabelas correspondentes do seu banco de dados PostgreSQL.

### **1. Configuração do Backend (API)**

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/joaoreis28/Mapa-Interativo.git
    cd Mapa-Interativo
    ```

2.  **Instale as dependências do servidor:**
    ```bash
    npm install
    ```

3.  **Crie um arquivo `.env`** na raiz do projeto e adicione as credenciais do seu banco de dados:
    ```.env
    DB_USER=seu_usuario_do_banco
    DB_HOST=localhost
    DB_DATABASE=seu_banco_de_dados
    DB_PASSWORD=sua_senha_do_banco
    DB_PORT=5432
    ```

4.  **Inicie o servidor:**
    ```bash
    node api.js
    ```
    O servidor da API estará rodando em `http://localhost:3000`.

### **2. Configuração do Frontend**

1.  Não há um processo de build complexo para o frontend. Basta abrir o arquivo `index.html` em um navegador web.
2.  É recomendado usar uma extensão como o **Live Server** no Visual Studio Code para servir os arquivos estáticos (`index.html`, `script.js`, `style.css`) e evitar problemas com CORS.

