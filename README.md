# 🦖 TiposaurusRex - Documentação Atualizada

## 📚 Visão Geral

TiposaurusRex é uma ferramenta CLI para gerar automaticamente tipos TypeScript a partir de bancos de dados MySQL e
consultas SQL. Elimine a digitação manual e reduza erros com tipagem forte gerada diretamente do seu esquema de banco de
dados.

## 🚀 Instalação

``` bash
# Instalação global
npm install -g tiposaurus-rex

# OU instalação local
npm install --save-dev tiposaurus-rex
```

## 🔧 Uso Básico

### 1. Inicializar

``` bash
tiposaurus init
```

Este comando cria um arquivo na raiz do projeto. `tiposaurus.config.json`

### 2. Configurar

Edite o arquivo de configuração com suas informações:

``` json
{
  "db": {
    "host": "localhost",
    "user": "root",
    "password": "senha",
    "database": "meu_banco",
    "port": 3306
  },
  "queryDirs": ["./src/queries"],
  "outputDir": "./src/generated",
  "customTypes": {
    "decimal": "number",
    "timestamp": "Date"
  }
}
```

> ⚠️ **IMPORTANTE**: O arquivo contém credenciais sensíveis do banco de dados. **NÃO COMITE** este arquivo em seu
> repositório. Adicione ao para evitar que suas credenciais sejam expostas. `tiposaurus.config.json``.gitignore`
>

### 3. Gerar Tipos

``` bash
tiposaurus generate
```

## ⚙️ Comandos

| Comando                                       | Descrição                                    |
|-----------------------------------------------|----------------------------------------------|
| `tiposaurus init`                             | Cria arquivo de configuração                 |
| `tiposaurus generate`                         | Gera tipos a partir do banco e consultas SQL |
| `tiposaurus generate --config=<caminho>`      | Usa um arquivo de configuração específico    |
| `tiposaurus generate --output=<diretório>`    | Define o diretório de saída                  |
| `tiposaurus generate --templates=<diretório>` | Define o diretório de templates              |
| `tiposaurus --help`                           | Exibe ajuda                                  |

## 📝 Arquivos SQL

Crie arquivos SQL com anotações especiais para definir metadados e tipos de retorno:

``` sql
-- @name getUserWithOrders
-- @description Busca usuário com seus pedidos
-- @param userId: number
-- @returnType UserWithOrders
-- @returnSingle true
-- @return users.id
-- @return users.name
-- @return users.email
-- @return orders.id to orderId
-- @return orders.total to orderTotal
-- @return orders.created_at to orderDate: Date
-- @return CONCAT(DATE_FORMAT(orders.created_at, '%Y-%m-%d'), ' - Order ', CAST(orders.id as char)) to orderLabel
SELECT
    u.id,
    u.name,
    u.email,
    o.id as orderId,
    o.total as orderTotal,
    o.created_at as orderDate,
    CONCAT(DATE_FORMAT(o.created_at, '%Y-%m-%d'), ' - Order ', CAST(o.id as char)) as orderLabel
FROM
    users u
        JOIN
    orders o ON u.id = o.user_id
WHERE
    u.id = ?;
```

### Anotações Suportadas

| Anotação          | Descrição                        | Exemplo                                                            |
|-------------------|----------------------------------|--------------------------------------------------------------------|
| `@name`           | Nome da consulta (obrigatório)   | `-- @name getUserById`                                             |
| `@description`    | Descrição da consulta            | `-- @description Busca usuário pelo ID`                            |
| `@param`          | Parâmetro com nome e tipo        | `-- @param id: number`                                             |
| `@returnType`     | Tipo de retorno da consulta      | `-- @returnType UserWithOrders`                                    |
| `@returnSingle`   | Indica retorno único (não array) | `-- @returnSingle true`                                            |
| `@return`         | Campo de retorno com metadados   | `-- @return users.id` ou `-- @return orders.id to orderId: number` |
| `@returnFunction` | Define função SQL customizada    | `-- @returnFunction totalAmount: SUM(o.total)`                     |

## 📊 Configuração Detalhada

### Estrutura do arquivo tiposaurus.config.json

``` json
{
  "db": {
    "host": "localhost",         // Endereço do servidor MySQL
    "user": "root",              // Nome do usuário do banco
    "password": "senha",         // Senha (NÃO COMITAR!)
    "database": "meu_banco",     // Nome do banco de dados
    "port": 3306                 // Porta (opcional, padrão: 3306)
  },
  "queryDirs": [                 // Diretórios onde estão os arquivos SQL
    "./src/queries",
    "./src/reports/queries"
  ],
  "outputDir": "./src/generated", // Diretório onde serão gerados os arquivos
  "customTypes": {                // Mapeamento personalizado de tipos SQL para TS
    "decimal": "number",
    "tinyint(1)": "boolean",
    "json": "Record<string, any>"
  },
  "templates": "./templates"      // Diretório de templates personalizados (opcional)
}
```

### Segurança e Boas Práticas

1. **Proteção de Credenciais**:
    - Adicione ao `tiposaurus.config.json``.gitignore`
    - Use uma versão do arquivo sem credenciais reais para compartilhar exemplos com a equipe
    - Em ambientes CI/CD, gere o arquivo de configuração durante a execução

2. **Configurações Ambientais**:
    - Para diferentes ambientes (dev, staging, prod), crie arquivos separados:
        - `tiposaurus.dev.json`
        - `tiposaurus.prod.json`

    - Use a opção `--config` para especificar qual usar: `tiposaurus generate --config=tiposaurus.dev.json`

3. **Diretórios Recomendados**:
    - Arquivos SQL: `src/queries/`
    - Tipos gerados: `src/generated/`
    - Templates personalizados: `templates/`

## 📊 Saída Gerada

O TiposaurusRex gera:

1. Interfaces para tabelas do banco de dados

``` typescript
export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  created_at?: Date;
}
```

1. Interfaces personalizadas para tipos de retorno

``` typescript
export interface UserWithOrders {
  id: number;
  name: string;
  email: string;
  orderId: number;
  orderTotal: number;
  orderDate: Date;
  orderLabel: string;
}
```

1. Tipos e funções para consultas

``` typescript
export interface GetUserWithOrdersParams {
  userId: number;
}

export type GetUserWithOrdersResult = UserWithOrders;

export const getUserWithOrdersQuery = `SELECT
    u.id AS "id",
    u.name AS "name",
    u.email AS "email",
    o.id AS "orderId",
    o.total AS "orderTotal",
    o.created_at AS "orderDate",
    CONCAT(DATE_FORMAT(o.created_at, '%Y-%m-%d'), ' - Order ', CAST(o.id as char)) AS "orderLabel"
FROM
    users u
        JOIN
    orders o ON u.id = o.user_id
WHERE
    u.id = ?`;

export async function getUserWithOrders(
  db: mysql.Connection,
  params: GetUserWithOrdersParams
): Promise<UserWithOrders> {
  const rows = (await db.execute(getUserWithOrdersQuery, Object.values(params)))[0];
  return rows as unknown as UserWithOrders;
}
```

## 📝 Escrevendo Consultas SQL Eficientes

### Nomenclatura de Campos de Retorno

O TiposaurusRex agora suporta a sintaxe `to` para definir aliases de forma mais clara:

``` sql
-- Sintaxe anterior com "as"
-- @return orders.created_at as orderDate

-- Nova sintaxe com "to" (recomendada)
-- @return orders.created_at to orderDate
```

Esta nova sintaxe evita conflitos com a palavra-chave SQL "AS" e torna a intenção do mapeamento mais clara.

### Tratamento de Funções SQL

Para expressões SQL mais complexas, você tem duas opções:

1. **Usando @return com "to":**

``` sql
-- @return CONCAT(u.first_name, ' ', u.last_name) to nomeCompleto
```

1. **Usando @returnFunction:**

``` sql
-- @returnFunction nomeCompleto: CONCAT(u.first_name, ' ', u.last_name)
-- @returnFunction diasAtraso: DATEDIFF(NOW(), o.due_date)
```

Ambas as abordagens funcionam, mas a primeira é mais consistente com o padrão de mapeamento usado para campos simples.

### Resolução de Conflitos de Alias

Com as melhorias recentes, o TiposaurusRex agora trata corretamente:

1. Funções SQL com aliases explícitos
2. Múltiplos aliases (evitando duplicações como `AS "alias" AS propertyX`)
3. Aliases em colunas com aspas simples ou duplas

### Consultas com Múltiplas Tabelas

Para consultas que combinam várias tabelas, recomendamos:

1. Usar aliases de tabela consistentes (por exemplo, para users, `o` para orders) `u`
2. Definir explicitamente o retorno de cada campo com `@return`
3. Usar a sintaxe `to` para mapear para nomes descritivos

``` sql
-- @name getUserOrders
-- @description Lista todos os pedidos de um usuário com detalhes
-- @param userId: number
-- @returnType UserOrderDetail
-- @return users.id to userId
-- @return users.name to userName
-- @return orders.id to orderId
-- @return products.name to productName
-- @return order_items.quantity
-- @return order_items.price to itemPrice
-- @return order_items.quantity * order_items.price to totalValue: number
SELECT 
    u.id as userId,
    u.name as userName,
    o.id as orderId,
    p.name as productName,
    oi.quantity,
    oi.price as itemPrice,
    (oi.quantity * oi.price) as totalValue
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE u.id = ?
```

## 🛠️ Exemplo de Uso no Código

``` typescript
import { getUserWithOrders } from './generated/queries';
import mysql from 'mysql2/promise';

async function main() {
  // Criar conexão com o banco
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'senha',
    database: 'meu_banco'
  });
  
  // Utilizar a função gerada - com tipagem completa
  const userWithOrders = await getUserWithOrders(connection, { userId: 1 });
  
  // Todos os campos têm tipagem automática
  console.log(`Usuário: ${userWithOrders.name}`);
  console.log(`Email: ${userWithOrders.email}`);
  console.log(`Valor do pedido: ${userWithOrders.orderTotal}`);
  console.log(`Data do pedido: ${userWithOrders.orderDate.toLocaleDateString()}`);
  console.log(`Etiqueta: ${userWithOrders.orderLabel}`);
  
  // Fechar conexão
  await connection.end();
}
```

## 🔄 Fluxo de Trabalho Recomendado

1. **Configuração Inicial**
    - Execute `tiposaurus init` para criar o arquivo de configuração
    - Ajuste as configurações de banco de dados e diretórios
    - Adicione ao `tiposaurus.config.json``.gitignore`

2. **Desenvolvimento de Consultas**
    - Crie seus arquivos SQL nos diretórios configurados
    - Adicione anotações , , , etc. `@name``@param``@return`
    - Use a sintaxe `to` para mapear campos para propriedades
    - Organize as consultas em arquivos por domínio (users.sql, orders.sql)

3. **Geração e Uso dos Tipos**
    - Execute `tiposaurus generate` após criar ou modificar consultas
    - Importe e utilize as funções geradas em seu código TypeScript
    - Beneficie-se da tipagem automática e autocompletion no seu IDE

4. **Atualização de Consultas**
    - Modifique as consultas SQL conforme necessário
    - Regenere os tipos com `tiposaurus generate`
    - Todas as alterações serão refletidas nas interfaces TypeScript

5. **Integração Contínua**
    - Adicione o comando de geração ao seu pipeline de build
    - Configure para usar um arquivo de configuração específico por ambiente

## 📚 Recursos Avançados

### Templates Personalizados

O TiposaurusRex usa Handlebars para renderizar os tipos. Você pode personalizar os templates copiando os padrões e
modificando-os:

``` bash
tiposaurus generate --templates=./meus-templates
```

**Template de Interface (interface.hbs)**:

``` handlebars
/**
 * Interface gerada para a tabela: {{tableName}}
 * @generated Este arquivo foi gerado automaticamente em {{timestamp}}
 */
export interface {{pascalCase interfaceName}} {
{{#each fields}}
  {{name}}{{#if nullable}}?{{/if}}: {{type}};
{{/each}}
}
```

**Template de Índice (index.hbs)**:

``` handlebars
/**
 * @generated Este arquivo foi gerado automaticamente em {{timestamp}}
 */

export const queryExecutors = {
{{#each queries}}
  {{camelCase name}},
{{/each}}
};
```

### Inferência de Tipos Automática

O sistema analisa automaticamente os campos de retorno e infere os tipos TypeScript apropriados:

- Campos com `id` ou terminados em são inferidos como `number` `_id`
- Campos com `date`, `time` ou `created_at` são inferidos como `Date`
- Campos com ou são inferidos como `is_``has_``boolean`
- Funções SQL como são inferidas como , como `number`, etc. `CONCAT``string``SUM`
- Campos restantes são inferidos como `string`

Você pode sobrescrever essa inferência especificando o tipo explicitamente:

``` sql
-- @return users.id                          -- inferido como number
-- @return users.name                        -- inferido como string
-- @return users.is_active                   -- inferido como boolean
-- @return orders.created_at to orderDate    -- inferido como Date
-- @return orders.status: 'pending' | 'completed' | 'cancelled'  -- tipo literal
```

### Tratamento de Funções SQL Melhorado

A nova versão trata corretamente aliases em funções SQL complexas, evitando duplicação de alias:

``` sql
-- Antes (problemático):
CONCAT(...) AS "test" AS property4

-- Agora (corrigido):
CONCAT(...) AS "test"
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Consulte o arquivo CONTRIBUTING.md no nosso repositório para mais informações sobre como
contribuir com o projeto.

## 📄 Licença

Este projeto está licenciado sob a Licença MIT.
