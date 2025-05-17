# 🦖 TiposaurusRex

> O rei dos geradores de tipos TypeScript para consultas SQL!
>

## 📚 Visão Geral
TiposaurusRex é uma ferramenta CLI para gerar automaticamente tipos TypeScript a partir de bancos de dados MySQL e consultas SQL. Elimine a digitação manual e reduza erros com tipagem forte gerada diretamente do seu esquema.

## 🚀 Instalação
```shell script
# Instalação global
npm install -g tiposaurus-rex

# OU instalação local
npm install --save-dev tiposaurus-rex
```


## 🔧 Uso Básico
### 1. Inicializar
```shell script
tiposaurus init
```

Este comando cria um arquivo `tiposaurus.config.json` na raiz do projeto.

### 2. Configurar
Edite o arquivo de configuração com suas informações:
```json
{
  "db": {
    "host": "localhost",
    "user": "root",
    "password": "senha",
    "database": "meu_banco",
    "port": 3306
  },
  "queryDirs": ["./src/queries"],
  "outputDir": "./src/types",
  "customTypes": {
    "decimal": "number",
    "timestamp": "Date"
  }
}
```


### 3. Gerar Tipos
```shell script
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

```sql
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

## 📊 Saída Gerada
O TiposaurusRex gera:

1. Interfaces para tabelas do banco de dados
```typescript
export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  created_at?: Date;
}
```


2. Interfaces personalizadas para tipos de retorno
```typescript
export interface UserWithOrders {
  id: number;
  name: string;
  email: string;
  orderId: number;
  orderTotal: number;
  orderDate: Date;
}
```


3. Tipos e funções para consultas
```typescript
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
  db: { execute<T>(query: string, params?: any[]): Promise<T[]> },
  params: GetUserWithOrdersParams
): Promise<UserWithOrders> {
  const result = await db.execute<UserWithOrders>(
    getUserWithOrdersQuery,
    Object.values(params)
  );
  return result[0];
}
```


4. Exportação centralizada de todas as consultas
```typescript
export const queryExecutors = {
  getUserWithOrders,
  insertUser
};
```


## 🛠️ Exemplo de Uso no Código
```typescript
import { getUserWithOrders } from './types/users';
import { createMySQLConnection } from './database';

async function main() {
  const db = await createMySQLConnection();
  
  const userWithOrders = await getUserWithOrders(db, { userId: 1 });
  
  console.log(`Usuário: ${userWithOrders.name}`);
  console.log(`Email: ${userWithOrders.email}`);
  console.log(`Valor do pedido: ${userWithOrders.orderTotal}`);
  console.log(`Data do pedido: ${userWithOrders.orderDate.toLocaleDateString()}`);
}
```


## 🔄 Fluxo de Trabalho Recomendado
1. Crie seu banco de dados e tabelas
2. Escreva consultas SQL nos arquivos `.sql` com anotações
3. Execute `tiposaurus generate`
4. Importe e use os tipos e funções gerados no seu código TypeScript
5. Atualize suas consultas conforme necessário e regenere os tipos

## 📚 Recursos Avançados

### Templates Personalizados
O TiposaurusRex usa Handlebars para renderizar os tipos. Você pode personalizar os templates copiando os padrões do diretório `/templates` e especificando seu diretório com a opção `--templates`.

### Definição de Tipos Personalizados
Configure mapeamentos personalizados entre tipos SQL e TypeScript no arquivo de configuração:

```json
"customTypes": {
  "decimal": "number",
  "json": "Record<string, any>",
  "enum('ativo','inativo')": "Status"
}
```


### Inferência de Tipos Automática
O sistema analisa automaticamente os campos de retorno através das anotações `@return` e gera interfaces TypeScript correspondentes. Você pode especificar o tipo exato para cada campo:

```sql
-- @return users.id
-- @return users.name
-- @return orders.created_at as orderDate: Date
```


## 🤝 Contribuindo
Contribuições são bem-vindas! Consulte o arquivo CONTRIBUTING.md no nosso repositório para mais informações sobre como contribuir com o projeto.

## 📄 Licença
Este projeto está licenciado sob a Licença MIT.