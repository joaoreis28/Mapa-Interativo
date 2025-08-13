const apiUrlMeusPontos = 'http://localhost:3000/api/meus-pontos';
const apiUrlSetores = 'http://localhost:3000/api/setores-censitarios';
const apiUrlCuritibaBairros = 'http://localhost:3000/api/curitiba-bairros';
const apiUrlParanaMunicipios = 'http://localhost:3000/api/parana-municipios';
const apiUrlRenda = 'http://localhost:3000/api/renda-por-setor';
const apiUrlAlfabetizacao = 'http://localhost:3000/api/alfabetizacao-por-setor';
const apiUrlGuardaPontos = 'http://localhost:3000/api/guarda-pontos';
const apiUrlTiposOcorrencia = 'http://localhost:3000/api/tipos-ocorrencia';

const vistaParana   = { lat: -24.5,  lon: -51.5, zoom: 7 };
const vistaCuritiba = { lat: -25.45, lon: -49.27, zoom: 11 };

const meuMapa   = L.map('mapa').setView([vistaParana.lat, vistaParana.lon], vistaParana.zoom);
const infoPanel = document.getElementById('info-content');
const loader    = document.getElementById('loader');

const bdFilterPanel = document.getElementById('bd-filter-panel');
const crimeFilterPanel = document.getElementById('crime-filter-panel');
const filtroTipoGuardaContainer = document.getElementById('filtro-tipo-guarda-container');

const legendaPopulacao = document.getElementById('population-legend');
const legendaRenda = document.getElementById('income-legend');
const legendaAlfabetizacao = document.getElementById('literacy-legend');

let dadosRenda     = {};
let dadosAlfabetizacao = {};
let camadaParana, camadaPopulacao, camadaCuritiba, camadaRenda, camadaAlfabetizacao, camadaDoBanco, camadaGuarda, drawnItems;


async function carregarDadosRendaAPI() {
    try {
        const res = await fetch(apiUrlRenda);
        if (!res.ok) throw new Error(`Erro na API de renda: ${res.statusText}`);
        return await res.json();
    } catch (err) {
        console.error('Erro ao carregar dados de renda da API:', err);
        return {};
    }
}

async function carregarDadosAlfabetizacaoAPI() {
    try {
        const res = await fetch(apiUrlAlfabetizacao);
        if (!res.ok) throw new Error(`Erro na API de alfabetização: ${res.statusText}`);
        return await res.json();
    } catch (err) {
        console.error('Erro ao carregar dados de alfabetização da API:', err);
        return {};
    }
}

function debounce(func, tempoEspera) {
    let timeout;
    return function(...args) {
        const contexto = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(contexto, args), tempoEspera);
    };
}

function obterCorPopulacao(pop) { return pop > 500000 ? '#800026' : pop > 100000 ? '#BD0026' : pop > 50000  ? '#E31A1C' : pop > 20000  ? '#FC4E2A' : pop > 10000  ? '#FD8D3C' : pop > 5000   ? '#FEB24C' : '#FED976'; }
function obterCorRenda(renda) { return renda > 10000 ? '#751902' : renda > 5000  ? '#f94e23' : renda > 3000  ? '#c47d00' : renda > 2000  ? '#8e9417' : renda > 1000  ? '#5f9f55' : '#45a185'; }
function obterCorAlfabetizacao(taxa) { 
    return taxa > 98 ? '#08306b' : taxa > 95 ? '#08519c' : taxa > 90 ? '#2171b5' : taxa > 85 ? '#4292c6' : taxa > 80 ? '#6baed6' : taxa > 70 ? '#9ecae1' : '#c6dbef';
}

function estilizarMunicipio(f) { const pop = f.properties.POPULACAO || 0; return { fillColor: obterCorPopulacao(pop), weight: 2, color: 'white', dashArray: '3', fillOpacity: 0.7 }; }
function estilizarRenda(f) { const setor = f.properties.CD_SETOR; const renda = dadosRenda[setor] || 0; return { fillColor: obterCorRenda(renda), weight: 1, color: 'white', fillOpacity: 0.7 }; }
function estilizarAlfabetizacao(f) { const setor = f.properties.CD_SETOR; const taxa = dadosAlfabetizacao[setor] || 0; return { fillColor: obterCorAlfabetizacao(taxa), weight: 1, color: 'white', fillOpacity: 0.7 }; }

function atualizarPainel(props, tipo) {
    if (tipo === 'municipio') {
        const pop = props.POPULACAO || 0;
        infoPanel.innerHTML = `<p><strong>Município:</strong> ${props.NM_MUN}</p><p><strong>Código IBGE:</strong> ${props.CD_MUN}</p><p><strong>População:</strong> ${pop.toLocaleString('pt-BR')}</p>`;
    } else if (tipo === 'bairro') {
        infoPanel.innerHTML = `<p><strong>Bairro:</strong> ${props.nome}</p>`;
    } else if (tipo === 'renda') {
        const renda = dadosRenda[props.CD_SETOR] || 0;
        infoPanel.innerHTML = `<p><strong>Setor:</strong> ${props.CD_SETOR}</p><p><strong>Renda Média:</strong> R$ ${renda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>`;
    } else if (tipo === 'alfabetizacao') {
        const taxa = dadosAlfabetizacao[props.CD_SETOR] || 0;
        infoPanel.innerHTML = `<p><strong>Setor:</strong> ${props.CD_SETOR}</p><p><strong>Taxa de Alfabetização:</strong> ${taxa.toFixed(2)}%</p>`;
    }
}

function atualizarVisibilidadeLegenda(camadaAtiva) {
    legendaPopulacao.style.display = 'none';
    legendaRenda.style.display = 'none';
    legendaAlfabetizacao.style.display = 'none';

    if (camadaAtiva === "População do Paraná") {
        legendaPopulacao.style.display = 'block';
    } else if (camadaAtiva === "Renda por Setor Censitário") {
        legendaRenda.style.display = 'block';
    } else if (camadaAtiva === "Alfabetização por Setor Censitário") {
        legendaAlfabetizacao.style.display = 'block';
    }
}

function popularFiltroTiposOcorrencia(tipos) {
    filtroTipoGuardaContainer.innerHTML = ''; 
    tipos.forEach(tipo => {
        const label = document.createElement('label');
        label.style.display = 'block';
        label.style.textTransform = 'capitalize';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'filtro-tipo-guarda-chk';
        checkbox.value = tipo;
        checkbox.checked = true;

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(' ' + tipo.toLowerCase()));
        filtroTipoGuardaContainer.appendChild(label);
    });

    document.querySelectorAll('.filtro-tipo-guarda-chk').forEach(chk => {
        chk.addEventListener('change', () => {
            if (meuMapa.hasLayer(camadaGuarda)) {
                atualizarCamadaGuarda();
            }
        });
    });
}

async function atualizarCamadasParana() {
    const bounds = meuMapa.getBounds().toBBoxString();
    loader.style.display = 'block';
    try {
        const res = await fetch(`${apiUrlParanaMunicipios}?bounds=${bounds}`);
        if (!res.ok) throw new Error(`Erro na API de municípios: ${res.statusText}`);
        const dados = await res.json();
        camadaParana.clearLayers();
        camadaParana.addData(dados);
        camadaPopulacao.clearLayers();
        camadaPopulacao.addData(dados);
    } catch (err) {
        console.error('Erro ao carregar municípios do banco:', err);
    } finally {
        loader.style.display = 'none';
    }
}

async function atualizarCamadaDePontos() {
    const bounds = meuMapa.getBounds().toBBoxString();
    const periodoSelecionado = document.querySelector('input[name="periodo-bd"]:checked').value;
    const apiUrl = `${apiUrlMeusPontos}?bounds=${bounds}&periodo=${periodoSelecionado}`;

    loader.style.display = 'block';
    try {
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`Erro na API de pontos: ${res.statusText}`);
        const dados = await res.json();
        camadaDoBanco.clearLayers();

        const novaCamadaDePontos = L.geoJSON(dados, {
            onEachFeature: (f, l) => {
                const dataFormatada = new Date(f.properties.data_hora).toLocaleString('pt-BR');
                l.bindPopup(`<b>Data e Hora:</b> ${dataFormatada}`);
            }
        });
        camadaDoBanco.addLayer(novaCamadaDePontos);
    } catch (err) {
        console.error('Erro ao carregar pontos do banco:', err);
    } finally {
        loader.style.display = 'none';
    }
}

async function atualizarCamadaGuarda() {
    const bounds = meuMapa.getBounds().toBBoxString();
    const periodoSelecionado = document.querySelector('input[name="periodo-guarda"]:checked').value;
    
    const tiposSelecionados = Array.from(document.querySelectorAll('.filtro-tipo-guarda-chk:checked'))
                                   .map(chk => chk.value);

    let apiUrl = `${apiUrlGuardaPontos}?bounds=${bounds}&periodo=${periodoSelecionado}`;
    if (tiposSelecionados.length > 0) {
        apiUrl += `&tipos=${tiposSelecionados.join(',')}`;
    }

    loader.style.display = 'block';
    try {
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`Erro na API de pontos da guarda: ${res.statusText}`);
        const dados = await res.json();
        camadaGuarda.clearLayers();

        const novaCamadaDePontos = L.geoJSON(dados, {
            onEachFeature: (f, l) => {
                const dataFormatada = new Date(f.properties.data_ponto).toLocaleString('pt-BR');
                const descFormatada = f.properties.descricao.toLowerCase().replace(/^\w/, c => c.toUpperCase());
                l.bindPopup(`<b>${descFormatada}</b><br>Data: ${dataFormatada}`);
            }
        });
        camadaGuarda.addLayer(novaCamadaDePontos);
    } catch (err) {
        console.error('Erro ao carregar pontos da guarda do banco:', err);
    } finally {
        loader.style.display = 'none';
    }
}

async function atualizarCamadaDeSetores() {
    const bounds = meuMapa.getBounds().toBBoxString();
    loader.style.display = 'block';
    try {
        const res = await fetch(`${apiUrlSetores}?bounds=${bounds}`);
        if (!res.ok) throw new Error(`Erro na API de setores: ${res.statusText}`);
        const dados = await res.json();
        camadaRenda.clearLayers();
        camadaAlfabetizacao.clearLayers();
        camadaRenda.addData(dados);
        camadaAlfabetizacao.addData(dados);
    } catch (err) { console.error('Erro ao carregar setores do banco:', err);
    } finally { loader.style.display = 'none'; }
}

async function atualizarCamadaBairrosCuritiba() {
    const bounds = meuMapa.getBounds().toBBoxString();
    loader.style.display = 'block';
    try {
        const res = await fetch(`${apiUrlCuritibaBairros}?bounds=${bounds}`);
        if (!res.ok) throw new Error(`Erro na API de bairros: ${res.statusText}`);
        const dados = await res.json();
        camadaCuritiba.clearLayers();
        camadaCuritiba.addData(dados);
    } catch (err) {
        console.error('Erro ao carregar bairros de Curitiba do banco:', err);
    } finally {
        loader.style.display = 'none';
    }
}

async function analisarAreaDesenhada(polygonGeoJSON) {
    infoPanel.innerHTML = '<p>Analisando área desenhada...</p>';
    loader.style.display = 'block';

    try {
        const response = await fetch('http://localhost:3000/api/analise-area', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ polygon: polygonGeoJSON.geometry }),
        });

        if (!response.ok) {
            throw new Error('A resposta da API de análise não foi bem-sucedida.');
        }

        const resultado = await response.json();

        infoPanel.innerHTML = `
            <h3>Análise da Área Desenhada</h3>
            <p><strong>Ocorrências (BD):</strong> ${resultado.crime_bd || 0}</p>
            <p><strong>Ocorrências (Guarda):</strong> ${resultado.crime_guarda || 0}</p>
        `;

    } catch (err) {
        console.error('Erro ao chamar API de análise:', err);
        infoPanel.innerHTML = '<p class="error-message">Não foi possível analisar a área. Tente novamente.</p>';
    } finally {
        loader.style.display = 'none';
    }
}

function criarPoligonoDoCirculo(circleLayer, sides = 64) {
    const center = circleLayer.getLatLng();
    const radius = circleLayer.getRadius();
    const points = [];
    
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * 2 * Math.PI;
        const dx = radius * Math.cos(angle);
        const dy = radius * Math.sin(angle);
        const lat = center.lat + (180 / Math.PI) * (dy / 6378137);
        const lng = center.lng + (180 / Math.PI) * (dx / 6378137) / Math.cos(center.lat * Math.PI / 180);
        points.push([lng, lat]);
    }
    points.push(points[0]); 

    return {
        type: "Feature",
        geometry: {
            type: "Polygon",
            coordinates: [points]
        }
    };
}

async function inicializarMapaInterativo() {
    loader.style.display = 'block';
    try {
        const tiposOcorrenciaPromise = fetch(apiUrlTiposOcorrencia).then(res => res.json());

         [dadosRenda, dadosAlfabetizacao, tiposOcorrencia] = await Promise.all([
            carregarDadosRendaAPI(),
            carregarDadosAlfabetizacaoAPI(),
            tiposOcorrenciaPromise
        ]);

        popularFiltroTiposOcorrencia(tiposOcorrencia);
        
        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(meuMapa);
        const satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles &copy; Esri' });

        camadaParana = L.geoJSON(null, { style: { color: "#006699", weight: 1, fillOpacity: 0.1 }, onEachFeature: (f, l) => { l.on({ mouseover: e => e.target.setStyle({ weight: 3, color: '#004466', fillOpacity: 0.3 }), mouseout: e => camadaParana.resetStyle(e.target), click: e => atualizarPainel(f.properties, 'municipio') }); l.bindPopup(`<b>Município:</b> ${f.properties.NM_MUN}`); } });
        camadaPopulacao = L.geoJSON(null, { style: estilizarMunicipio, onEachFeature: (f, l) => { l.on({ mouseover: e => e.target.setStyle({ weight: 3, color: '#666', fillOpacity: 0.9 }), mouseout: e => camadaPopulacao.resetStyle(e.target), click: e => atualizarPainel(f.properties, 'municipio') }); const pop = f.properties.POPULACAO || 0; l.bindPopup(`<b>${f.properties.NM_MUN}</b><br>Pop: ${pop.toLocaleString('pt-BR')}`); } });
        camadaCuritiba = L.geoJSON(null, { style: { color: "#e60000", weight: 2, fillOpacity: 0.15 }, onEachFeature: (f, l) => { l.on({ mouseover: e => e.target.setStyle({ weight: 4, color: '#b30000', fillOpacity: 0.4 }), mouseout: e => camadaCuritiba.resetStyle(e.target), click: e => atualizarPainel(f.properties, 'bairro') }); l.bindPopup(`<b>Bairro:</b> ${f.properties.nome}`); } });
        camadaRenda = L.geoJSON(null, { style: estilizarRenda, onEachFeature: (f, l) => { l.on({ mouseover: e => e.target.setStyle({ weight: 2, color: '#000', fillOpacity: 0.9 }), mouseout: e => camadaRenda.resetStyle(e.target), click: e => atualizarPainel(f.properties, 'renda') }); const renda = dadosRenda[f.properties.CD_SETOR] || 0; l.bindPopup(`<b>Setor:</b> ${f.properties.CD_SETOR}<br>R$ ${renda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`); } });
        camadaAlfabetizacao = L.geoJSON(null, { style: estilizarAlfabetizacao, onEachFeature: (f, l) => { l.on({ mouseover: e => e.target.setStyle({ weight: 2, color: '#000', fillOpacity: 0.9 }), mouseout: e => camadaAlfabetizacao.resetStyle(e.target), click: e => atualizarPainel(f.properties, 'alfabetizacao') }); const taxa = dadosAlfabetizacao[f.properties.CD_SETOR] || 0; l.bindPopup(`<b>Setor:</b> ${f.properties.CD_SETOR}<br>Alfabetização: ${taxa.toFixed(2)}%`); } });
        
        camadaDoBanco = L.markerClusterGroup();
        camadaGuarda = L.markerClusterGroup(); 
        drawnItems = new L.FeatureGroup();
        
        camadaPopulacao.addTo(meuMapa);
        atualizarCamadasParana();

        const baseMaps = { "OpenStreetMap": osm, "Satélite": satelite };

        const camadasTematicas = {
            "Contorno Municípios": camadaParana,
            "População do Paraná": camadaPopulacao,
            "Bairros de Curitiba": camadaCuritiba,
            "Renda por Setor Censitário": camadaRenda,
            "Alfabetização por Setor Censitário": camadaAlfabetizacao
        };

        const camadasDePontos = {
            "Ocorrências de Crime (BD)": camadaDoBanco,
            "Ocorrências de Crime (Guarda)": camadaGuarda 
        };

        const groupedOverlays = {
          "Camadas Temáticas (selecione uma)": camadasTematicas,
          "Pontos de Interesse": camadasDePontos,
          "Meus Desenhos": { "Desenhos": drawnItems }
        };
        
        const options = {
          exclusiveGroups: ["Camadas Temáticas (selecione uma)"],
          groupCheckboxes: true
        };

        L.control.groupedLayers(baseMaps, groupedOverlays, options).addTo(meuMapa);
        
        L.control.scale({ imperial: false }).addTo(meuMapa);
        
        meuMapa.addLayer(drawnItems);
        const drawControl = new L.Control.Draw({ edit: { featureGroup: drawnItems, remove: true }, draw: { polygon: true, rectangle: true, circle: true, marker: true, polyline: false, circlemarker: false } });
        meuMapa.addControl(drawControl);
        
        meuMapa.on(L.Draw.Event.CREATED, function (e) {
            const layer = e.layer;
            drawnItems.addLayer(layer);
        
            let geoJsonParaAnalisar;
        
            if (layer instanceof L.Circle) {
                geoJsonParaAnalisar = criarPoligonoDoCirculo(layer);
            } else if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
                geoJsonParaAnalisar = layer.toGeoJSON();
            }
        
            if (geoJsonParaAnalisar) {
                analisarAreaDesenhada(geoJsonParaAnalisar);
            }
        });
        
        meuMapa.on('overlayadd', function(e) {
            atualizarVisibilidadeLegenda(e.name);

            if (e.name === "Ocorrências de Crime (Guarda)") {
                crimeFilterPanel.style.display = 'block';
            }
            if (e.name === "Ocorrências de Crime (BD)") {
                bdFilterPanel.style.display = 'block';
            }

            if (e.name === "Bairros de Curitiba") {
                meuMapa.flyTo([vistaCuritiba.lat, vistaCuritiba.lon], vistaCuritiba.zoom);
            } else if (e.name === "População do Paraná" || e.name === "Contorno Municípios") {
                meuMapa.flyTo([vistaParana.lat, vistaParana.lon], vistaParana.zoom);
            }
            
            if (e.layer === camadaDoBanco) atualizarCamadaDePontos();
            if (e.layer === camadaGuarda) atualizarCamadaGuarda(); 
            if (e.layer === camadaRenda || e.layer === camadaAlfabetizacao) atualizarCamadaDeSetores();
            if (e.layer === camadaCuritiba) atualizarCamadaBairrosCuritiba();
            if (e.layer === camadaParana || e.layer === camadaPopulacao) atualizarCamadasParana();
        });

        meuMapa.on('overlayremove', function(e) {
            const camadasComLegenda = ["População do Paraná", "Renda por Setor Censitário", "Alfabetização por Setor Censitário"];
            if (camadasComLegenda.includes(e.name)) {
                atualizarVisibilidadeLegenda(null);
            }

            if (e.name === "Ocorrências de Crime (Guarda)") {
                crimeFilterPanel.style.display = 'none';
            }
            if (e.name === "Ocorrências de Crime (BD)") {
                bdFilterPanel.style.display = 'none';
            }
        });

        document.getElementById('filtro-periodo-guarda').addEventListener('change', function() {
            if (meuMapa.hasLayer(camadaGuarda)) {
                atualizarCamadaGuarda();
            }
        });

        document.getElementById('filtro-periodo-bd').addEventListener('change', function() {
            if (meuMapa.hasLayer(camadaDoBanco)) {
                atualizarCamadaDePontos();
            }
        });

      
        document.getElementById('select-all-guarda-types').addEventListener('click', () => {
            document.querySelectorAll('.filtro-tipo-guarda-chk').forEach(chk => chk.checked = true);
            if (meuMapa.hasLayer(camadaGuarda)) {
                atualizarCamadaGuarda();
            }
        });

        document.getElementById('deselect-all-guarda-types').addEventListener('click', () => {
            document.querySelectorAll('.filtro-tipo-guarda-chk').forEach(chk => chk.checked = false);
            if (meuMapa.hasLayer(camadaGuarda)) {
                atualizarCamadaGuarda();
            }
        });
    

        atualizarVisibilidadeLegenda("População do Paraná");
        
        const atualizarParanaDebounced = debounce(atualizarCamadasParana, 500);
        const atualizarPontosDebounced = debounce(atualizarCamadaDePontos, 500);
        const atualizarSetoresDebounced = debounce(atualizarCamadaDeSetores, 500);
        const atualizarBairrosDebounced = debounce(atualizarCamadaBairrosCuritiba, 500);
        const atualizarGuardaDebounced = debounce(atualizarCamadaGuarda, 500); 
        
        meuMapa.on('moveend', function() {
            if (meuMapa.hasLayer(camadaParana) || meuMapa.hasLayer(camadaPopulacao)) atualizarParanaDebounced();
            if (meuMapa.hasLayer(camadaDoBanco)) atualizarPontosDebounced();
            if (meuMapa.hasLayer(camadaGuarda)) atualizarGuardaDebounced(); 
            if (meuMapa.hasLayer(camadaRenda) || meuMapa.hasLayer(camadaAlfabetizacao)) atualizarSetoresDebounced();
            if (meuMapa.hasLayer(camadaCuritiba)) atualizarBairrosDebounced();
        });

    } catch (err) {
        console.error('Erro fatal ao inicializar mapa:', err);
        alert('Não foi possível carregar o mapa. Verifique o console para mais detalhes. ' + err.message);
    } finally {
        loader.style.display = 'none';
    }
}

inicializarMapaInterativo();