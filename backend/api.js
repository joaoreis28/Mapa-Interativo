require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());


const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

app.get('/api/meus-pontos', async (req, res) => {
    try {
        const { bounds, periodo } = req.query; 

        if (!bounds) {
            return res.status(400).send('Parâmetro "bounds" ausente.');
        }

        const [minLon, minLat, maxLon, maxLat] = bounds.split(',').map(parseFloat);

        let queryText = `
            SELECT
                datahoraregistro,
                ST_AsGeoJSON(geom) AS geometry
            FROM
                paranageo_geofiltrado
            WHERE
                geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
        `;
        
        const params = [minLon, minLat, maxLon, maxLat];

        if (periodo && periodo !== 'todos') {
            const hora = `EXTRACT(HOUR FROM datahoraregistro::timestamp)`;
            if (periodo === 'manha') {
                queryText += ` AND ${hora} >= 6 AND ${hora} < 12`;
            } else if (periodo === 'tarde') {
                queryText += ` AND ${hora} >= 12 AND ${hora} < 18`;
            } else if (periodo === 'noite') {
                queryText += ` AND (${hora} >= 18 OR ${hora} < 6)`;
            }
        }
        
        const { rows } = await pool.query(queryText, params);

        const geoJson = {
            type: "FeatureCollection",
            features: rows.map(row => ({
                type: "Feature",
                geometry: JSON.parse(row.geometry),
                properties: {
                    data_hora: row.datahoraregistro 
                }
            }))
        };
        res.json(geoJson);
    } catch (err) {
        console.error("Erro na consulta à tabela paranageo_geofiltrado:", err);
        res.status(500).send('Erro ao buscar pontos do BD');
    }
});

app.get('/api/setores-censitarios', async (req, res) => {
    try {
        const { bounds } = req.query;
        if (!bounds) {
            return res.status(400).send('Parâmetro "bounds" ausente.');
        }
        const [minLon, minLat, maxLon, maxLat] = bounds.split(',').map(parseFloat);

      
        const query = `
            SELECT
                "cd_setor", 
                ST_AsGeoJSON(geom) AS geometry
            FROM
                setores_censitarios_pr 
            WHERE
                geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
        `;

        const { rows } = await pool.query(query, [minLon, minLat, maxLon, maxLat]);

        const geoJson = {
            type: "FeatureCollection",
            features: rows.map(row => ({
                type: "Feature",
                geometry: JSON.parse(row.geometry),
                properties: {
                    CD_SETOR: row.cd_setor
                }
            }))
        };
        res.json(geoJson);
    } catch (err) {
        console.error("erro na consulta de setores:", err);
        res.status(500).send('Erro ao buscar setores');
    }
});



app.get('/api/curitiba-bairros', async (req, res) => {
    try {
        const { bounds } = req.query;
        if (!bounds) {
            return res.status(400).send('Parâmetro "bounds" ausente.');
        }
        const [minLon, minLat, maxLon, maxLat] = bounds.split(',').map(parseFloat);

        
        const query = `
            SELECT
                nome, -- Seleciona a coluna com o nome do bairro
                ST_AsGeoJSON(wkb_geometry) AS geometry
            FROM
                curitiba_bairros 
            WHERE
                wkb_geometry && ST_MakeEnvelope($1, $2, $3, $4, 4326)
        `;

        const { rows } = await pool.query(query, [minLon, minLat, maxLon, maxLat]);

        const geoJson = {
            type: "FeatureCollection",
            features: rows.map(row => ({
                type: "Feature",
                geometry: JSON.parse(row.geometry),
                properties: {
                    nome: row.nome 
                }
            }))
        };
        res.json(geoJson);
    } catch (err) {
        console.error("Erro na consulta de bairros:", err);
        res.status(500).send('Erro ao buscar bairros de Curitiba');
    }
});



app.get('/api/parana-municipios', async (req, res) => {
    try {
        const { bounds } = req.query;
        if (!bounds) {
            return res.status(400).send('Parâmetro "bounds" ausente.');
        }
        const [minLon, minLat, maxLon, maxLat] = bounds.split(',').map(parseFloat);

        
        const query = `
            SELECT
                m.nm_mun, 
                m.cd_mun,
                p. "POPULACAO_ESTIMADA",
                ST_AsGeoJSON(m.wkb_geometry) AS geometry
            FROM
                parana_municipios AS m
            LEFT JOIN 
                populacao_municipios AS p 
            ON 
                UPPER(unaccent(m.nm_mun)) = UPPER(unaccent(p."NOME_MUNICIPIO")) -- <<< A CORREÇÃO MÁGICA ESTÁ AQUI
            WHERE
                m.wkb_geometry && ST_MakeEnvelope($1, $2, $3, $4, 4326)
        `;

        const { rows } = await pool.query(query, [minLon, minLat, maxLon, maxLat]);

        const geoJson = {
            type: "FeatureCollection",
            features: rows.map(row => ({
                type: "Feature",
                geometry: JSON.parse(row.geometry),
                properties: {
                    NM_MUN: row.nm_mun,
                    CD_MUN: row.cd_mun,
                    POPULACAO: row.POPULACAO_ESTIMADA || 0
                }
            }))
        };
        res.json(geoJson);
    } catch (err) {
        console.error("Erro na consulta de municípios do Paraná:", err);
        res.status(500).send('Erro ao buscar municípios do Paraná');
    }
});

app.get('/api/renda-por-setor', async (req, res) => {
    try {
        
        const query = `
            SELECT
                "CD_SETOR",
                "V06004" 
            FROM
                renda_setor_pr
        `;

        const { rows } = await pool.query(query);

        const dadosRenda = rows.reduce((acc, row) => {
            
            acc[row.CD_SETOR] = parseFloat(row.V06004) || 0;
            return acc;
        }, {});

        res.json(dadosRenda);
    } catch (err) {
        console.error("Erro na consulta de renda por setor:", err);
        res.status(500).send('Erro ao buscar dados de renda por setor');
    }
});


app.get('/api/alfabetizacao-por-setor', async (req, res) => {
    try {
        
        const query = `
            SELECT
                "cd_setor", 
                "alfabetizacao2" 
            FROM
                alfabetizacao
        `;

        const { rows } = await pool.query(query);

        const dadosAlfabetizacao = rows.reduce((acc, row) => {
            acc[row.cd_setor] = parseFloat(row.alfabetizacao2) || 0;
            return acc;
        }, {});

        res.json(dadosAlfabetizacao);
    } catch (err) {
        console.error("Erro na consulta de dados de alfabetização:", err);
        res.status(500).send('Erro ao buscar dados de alfabetização por setor');
    }
});




app.get('/api/guarda-pontos', async (req, res) => {
    try {
        const { bounds, periodo, tipos } = req.query; 

        if (!bounds) {
            return res.status(400).send('Parâmetro "bounds" ausente.');
        }

        const [minLon, minLat, maxLon, maxLat] = bounds.split(',').map(parseFloat);
        
        let queryText = `
            SELECT "natureza1_descricao", "ocorrencia_data", ST_AsGeoJSON(geom) AS geometry
            FROM guarda_municipal_geom_10k_random
            WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
        `;
        const params = [minLon, minLat, maxLon, maxLat];

        if (periodo && periodo !== 'todos') {
            const hora = `EXTRACT(HOUR FROM "ocorrencia_data"::timestamp)`;
            if (periodo === 'manha') queryText += ` AND ${hora} >= 6 AND ${hora} < 12`;
            else if (periodo === 'tarde') queryText += ` AND ${hora} >= 12 AND ${hora} < 18`;
            else if (periodo === 'noite') queryText += ` AND (${hora} >= 18 OR ${hora} < 6)`;
        }

        if (tipos && tipos.length > 0) {
            const tiposArray = tipos.split(',');
            queryText += ` AND "natureza1_descricao" IN (${tiposArray.map((_, i) => `$${params.length + i + 1}`).join(',')})`;
            params.push(...tiposArray);
        }
        
        const { rows } = await pool.query(queryText, params);

        const geoJson = {
            type: "FeatureCollection",
            features: rows.map(row => ({
                type: "Feature",
                geometry: JSON.parse(row.geometry),
                properties: {
                    descricao: row.natureza1_descricao,
                    data_ponto: row.ocorrencia_data
                }
            }))
        };
        res.json(geoJson);
    } catch (err) {
        console.error("Erro na consulta à tabela guarda:", err);
        res.status(500).send('Erro ao buscar pontos da guarda');
    }
});




app.post('/api/analise-area', async (req, res) => {
    try {
        const { polygon } = req.body;

        if (!polygon) {
            return res.status(400).send('Geometria do polígono ausente.');
        }

        
        const query = `
            SELECT 'crime_bd' as tipo, COUNT(*) as contagem
            FROM paranageo_geofiltrado
            WHERE ST_Intersects(geom, ST_GeomFromGeoJSON($1))
            
            UNION ALL
            
            SELECT 'crime_guarda' as tipo, COUNT(*) as contagem
            FROM guarda_municipal_geom_10k_random
            WHERE ST_Intersects(geom, ST_GeomFromGeoJSON($1));
        `;

        const { rows } = await pool.query(query, [JSON.stringify(polygon)]);

        const resultado = rows.reduce((acc, row) => {
            acc[row.tipo] = parseInt(row.contagem, 10);
            return acc;
        }, {});

        res.json(resultado);

    } catch (err) {
        console.error("Erro na análise da área:", err);
        res.status(500).send('Erro ao analisar a área desenhada');
    }
});

app.get('/api/tipos-ocorrencia', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT "natureza1_descricao" 
            FROM guarda_municipal_geom_10k_random 
            WHERE "natureza1_descricao" IS NOT NULL 
            ORDER BY "natureza1_descricao" ASC;
        `;
        const { rows } = await pool.query(query);
        const tipos = rows.map(row => row.natureza1_descricao);
        res.json(tipos);
    } catch (err) {
        console.error("Erro ao buscar tipos de ocorrência:", err);
        res.status(500).send('Erro ao buscar tipos de ocorrência');
    }
});



app.listen(port, () => {
    console.log(`Servidor funfando em  http://localhost:${port}`);
});