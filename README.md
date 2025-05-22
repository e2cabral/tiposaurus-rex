# 🦖 TiposaurusRex

> O rei dos geradores de tipos TypeScript para consultas SQL!
>

## 📚 Visão Geral
TiposaurusRex é uma ferramenta CLI para gerar automaticamente tipos TypeScript a partir de bancos de dados MySQL e consultas SQL. Elimine a digitação manual e reduza erros com tipagem forte gerada diretamente do seu esquema de banco de dados.
## 🚀 Instalação
``` 
# Instalação global
npm install -g tiposaurus-rex

# OU instalação local
npm install --save-dev tiposaurus-rex
```
## 🔧 Uso Básico
### 1. Inicializar
``` 
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
> ⚠️ **IMPORTANTE**: O arquivo contém credenciais sensíveis do banco de dados. **NÃO COMITE** este arquivo em seu repositório. Adicione-o ao para evitar que suas credenciais sejam expostas. `tiposaurus.config.json``.gitignore`
>

### 3. Gerar Tipos
``` 
tiposaurus generate
```
## ⚙️ Comandos

| Comando | Descrição |
| --- | --- |
| `tiposaurus init` | Cria arquivo de configuração |
| `tiposaurus generate` | Gera tipos a partir do banco e consultas SQL |
| `tiposaurus generate --config=<caminho>` | Usa um arquivo de configuração específico |
| `tiposaurus generate --output=<diretório>` | Define o diretório de saída |
| `tiposaurus generate --templates=<diretório>` | Define o diretório de templates |
| `tiposaurus --help` | Exibe ajuda |
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
-- @return orders.id as orderId
-- @return orders.total as orderTotal
-- @return orders.created_at as orderDate: Date
SELECT
    u.id,
    u.name,
    u.email,
    o.id as orderId,
    o.total as orderTotal,
    o.created_at as orderDate
FROM
    users u
        JOIN
    orders o ON u.id = o.user_id
WHERE
    u.id = ?;
```
### Anotações Suportadas

| Anotação | Descrição | Exemplo |
| --- | --- | --- |
| `@name` | Nome da consulta (obrigatório) | `-- @name getUserById` |
| `@description` | Descrição da consulta | `-- @description Busca usuário pelo ID` |
| `@param` | Parâmetro com nome e tipo | `-- @param id: number` |
| `@returnType` | Tipo de retorno da consulta | `-- @returnType UserWithOrders` |
| `@returnSingle` | Indica retorno único (não array) | `-- @returnSingle true` |
| `@return` | Campo de retorno com metadados | `-- @return users.id` ou `-- @return orders.id as orderId: number` |
| `@returnFunction` | Define função SQL customizada | `-- @returnFunction totalAmount: SUM(o.total)` |
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
    - Adicione ao seu `tiposaurus.config.json``.gitignore`
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
}
```
1. Tipos e funções para consultas
``` typescript
export interface GetUserWithOrdersParams {
  userId: number;
}

export type GetUserWithOrdersResult = UserWithOrders;

export const getUserWithOrdersQuery = `SELECT
    u.id,
    u.name,
    u.email,
    o.id as orderId,
    o.total as orderTotal,
    o.created_at as orderDate
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
### Nomenclatura de Alias
O TiposaurusRex suporta nomenclatura camelCase para propriedades TypeScript, mesmo que você use snake_case no SQL. Para isso, use a sintaxe para definir o nome da propriedade: `as`
``` sql
-- @return orders.created_at as orderDate
```
Pode usar nomes longos como aliases sem preocupação - o problema que tratava incorretamente palavras reservadas dentro de nomes de alias (como "IN" em "cpfCnpjNomeInconstitucional") foi corrigido:
``` sql
-- @return users.id as cpfCnpjNomeInconstitucional
```
### Tratamento de Funções SQL
Para expressões SQL mais complexas que não são apenas campos de tabela, use a anotação `@returnFunction`:
``` sql
-- @returnFunction total: SUM(o.total)
-- @returnFunction nomeCompleto: CONCAT(u.first_name, ' ', u.last_name)
-- @returnFunction diasAtraso: DATEDIFF(NOW(), o.due_date)
```
### Consultas com Múltiplas Tabelas
Para consultas que combinam várias tabelas, recomendamos:
1. Usar aliases de tabela consistentes (por exemplo, para users, `o` para orders) `u`
2. Definir explicitamente o retorno de cada campo com `@return`
3. Usar nomes descritivos para os campos (ex: `orderId` em vez de apenas `id`)
``` sql
-- @name getUserOrders
-- @description Lista todos os pedidos de um usuário com detalhes
-- @param userId: number
-- @returnType UserOrderDetail
-- @return users.id as userId
-- @return users.name as userName
-- @return orders.id as orderId
-- @return products.name as productName
-- @return order_items.quantity
-- @return order_items.price as itemPrice
-- @returnFunction totalValue: (order_items.quantity * order_items.price)
SELECT 
    u.id,
    u.name,
    o.id,
    p.name,
    oi.quantity,
    oi.price,
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
    - Adicione anotações `@name`, `@param`, `@return`, etc.
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
O TiposaurusRex usa Handlebars para renderizar os tipos. Você pode personalizar os templates copiando os padrões do diretório `/templates` e especificando seu diretório com a opção `--templates`.
Exemplo de execução com templates personalizados:
``` shell
tiposaurus generate --templates=./meus-templates
```
### Inferência de Tipos Automática
O sistema analisa automaticamente os campos de retorno e infere os tipos TypeScript apropriados:
- Campos com `id` ou terminados em `_id` são inferidos como `number`
- Campos com `date`, `time` ou `created_at` são inferidos como `Date`
- Campos com `is_` ou `has_` são inferidos como `boolean`
- Campos restantes são inferidos como `string`

Você pode sobrescrever essa inferência especificando o tipo explicitamente:
``` sql
-- @return users.id                          -- inferido como number
-- @return users.name                        -- inferido como string
-- @return users.is_active                   -- inferido como boolean
-- @return orders.created_at as orderDate    -- inferido como Date
-- @return orders.status: 'pending' | 'completed' | 'cancelled'  -- tipo literal
```
## 🤝 Contribuindo
Contribuições são bem-vindas! Consulte o arquivo CONTRIBUTING.md no nosso repositório para mais informações sobre como contribuir com o projeto.
## 📄 Licença
Este projeto está licenciado sob a Licença MIT.
