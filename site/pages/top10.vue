<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-card flat width="375px">
          <h1>DBTC Top 10</h1>
        </v-card>
      </v-col>
    </v-row>
    <v-row>
      <v-col v-for="list in lists" :key="list.key" cols="auto">
        <v-card width="375px">
          <v-card-title
            :class="`${list.color}--text`"
          >
            <strong v-text="list.name" />
          </v-card-title>
          <v-card-subtitle v-text="list.desc" />
          <v-card-text>
            <v-simple-table>
              <template v-slot:default>
                <tbody>
                  <tr
                    v-for="item in list.data"
                    :key="item.ownerId"
                  >
                    <td
                      class="text-left"
                    >
                      {{ item.ownerName }}
                    </td>
                    <td
                      class="text-right"
                    >
                      {{ item.count }}
                    </td>
                  </tr>
                </tbody>
              </template>
            </v-simple-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
export default {
  async fetch () {
    const result = await this.$axios.$get('/api/dbtc/top10')
    this.lists.forEach((item) => {
      item.data = result[item.key]
    })
  },
  data () {
    return {
      lists: [
        {
          key: 'contributors',
          name: 'Contributors',
          desc: 'Contributed the most items to DBTC',
          color: 'teal',
          data: []
        },
        {
          key: 'linkers',
          name: 'Linkers',
          desc: 'Have put back the most frags',
          color: 'orange',
          data: []
        },
        {
          key: 'givers',
          name: 'Givers',
          desc: 'Have given the most frags',
          color: 'purple',
          data: []
        },
        {
          key: 'journalers',
          name: 'Journalers',
          desc: 'Created the most journal entries',
          color: 'blue',
          data: []
        },
        {
          key: 'collectors',
          name: 'Collectors',
          desc: 'Have the most DBTC frags alive',
          color: 'green',
          data: []
        }
      ]
    }
  }
}
</script>
