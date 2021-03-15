<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-card v-if="member" width="375px">
          <v-img
            v-if="member.avatarUrl"
            height="300px"
            :src="member.avatarUrl"
          />
          <v-card-title>{{ member.name }}</v-card-title>
          <v-card-subtitle>
            <div>{{ member.title }}{{ member.location ? ` · ${member.location}` : '' }}{{ ` · ${member.messageCount} messages` }}</div>
            <div>Joined {{ localeDateString(member.registerDate) + (member.registerAge ? ` · ${member.registerAge}` : '') }}</div>
            <div><span v-if="member.lastActivity">Last seen {{ differenceToNow(member.lastActivity) }} ago {{ '·' }} </span><a :href="member.viewUrl" target="_blank">view profile</a></div>
          </v-card-subtitle>

          <!-- Tank journals -->

          <div v-if="member.tankJournals.length">
            <v-divider />
            <v-card-text>
              <h3>Tank journals</h3>
              <div v-for="(tj, index) in member.tankJournals" :key="index">
                <a :href="tj.url" target="_blank">{{ tj.title }}</a>
              </div>
            </v-card-text>
          </div>

          <!-- Available frags -->

          <div v-if="member.availableFrags.length">
            <v-divider />
            <v-card-text>
              <h3>Has available frags</h3>
              <div v-for="(af, index) in member.availableFrags" :key="index">
                <span><strong>{{ af.count }}</strong></span>
                <router-link :to="`/frag/${af.fragId}`" target="_blank" v-text="af.name" />
                <span> ({{ af.type }})</span>
              </div>
            </v-card-text>
          </div>

          <!-- Waiting for frags -->
          <div v-if="member.waitingFor.length">
            <v-divider />
            <v-card-text>
              <h3>Would like frags of</h3>
              <div v-for="(wf, index) in member.waitingFor" :key="index">
                <router-link :to="`/frag/${wf.fragId}`" target="_blank" v-text="wf.name" />
                <span> ({{ wf.type }})</span>
              </div>
            </v-card-text>
          </div>

          <!-- DBTC links completed -->
          <div v-if="member.linksCompleted.length">
            <v-divider />
            <v-card-text>
              <h3>DBTC links completed</h3>
              <div v-for="(lc, index) in member.linksCompleted" :key="index">
                <span><strong>{{ lc.count }}</strong></span>
                <router-link :to="`/frag/${lc.fragId}`" target="_blank" v-text="lc.name" />
                <span> ({{ lc.type }})</span>
              </div>
            </v-card-text>
          </div>

          <!-- DBTC stats -->
          <div v-if="member.stats.dbtc.length">
            <v-divider />
            <v-card-text>
              <div class="mb-4">
                <h3>DBTC stats</h3>
                <router-link
                  :to="`/collection/dbtc?ownerId=${member.id}&ownerName=${encodeURIComponent(member.name)}`"
                  target="_blank"
                >
                  view collection
                </router-link>
              </div>
              <div v-for="(line, index) in member.stats.dbtc" :key="index">
                <div v-if="line.data.length" class="mx-2          ">
                  <h4>{{ line.title }}</h4>
                  <v-card-actions>
                    <span v-for="t in line.data" :key="t.type">
                      <strong> {{ t.count }} </strong>
                      <span v-if="t.fragIds" class="caption me-4">
                        <router-link :to="`/frags/${encodeURIComponent(t.fragIds.join(','))}`" target="_blank">  {{ t.type }} </router-link>
                      </span>
                      <span v-else class="caption me-4">  {{ t.type }} </span>
                    </span>
                  </v-card-actions>
                </div>
              </div>
            </v-card-text>
          </div>

          <!-- PIF stats -->
          <div v-if="member.stats.pif.length">
            <v-divider />
            <v-card-text>
              <div class="mb-4">
                <h3>PIF stats</h3>
                <router-link
                  :to="`/collection/pif?ownerId=${member.id}&ownerName=${encodeURIComponent(member.name)}`"
                  target="_blank"
                >
                  view collection
                </router-link>
              </div>
              <div v-for="(line, index) in member.stats.pif" :key="index">
                <div v-if="line.data.length" class="mx-2">
                  <h4>{{ line.title }}</h4>
                  <v-card-actions>
                    <span v-for="t in line.data" :key="t.type">
                      <strong> {{ t.count }} </strong>
                      <span v-if="t.fragIds" class="caption me-4">
                        <router-link :to="`/frags/${encodeURIComponent(t.fragIds.join(','))}`" target="_blank">  {{ t.type }} </router-link>
                      </span>
                      <span v-else class="caption me-4">  {{ t.type }} </span>
                    </span>
                  </v-card-actions>
                </div>
              </div>
            </v-card-text>
          </div>

          <!-- Private stats -->
          <div v-if="member.stats.private.length">
            <v-divider />
            <v-card-text>
              <h3 class="mb-4">
                Private collection
              </h3>
              <div v-for="(line, index) in member.stats.private" :key="index">
                <div v-if="line.data.length" class="mx-2">
                  <h4>{{ line.title }}</h4>
                  <v-card-actions>
                    <span v-for="t in line.data" :key="t.type">
                      <strong> {{ t.count }} </strong>
                      <span v-if="member.isMe && t.fragIds" class="caption me-4">
                        <router-link :to="`/frags/${encodeURIComponent(t.fragIds.join(','))}`" target="_blank">  {{ t.type }} </router-link>
                      </span>
                      <span v-else class="caption me-4">  {{ t.type }} </span>
                    </span>
                  </v-card-actions>
                </div>
              </div>
            </v-card-text>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import { differenceToNow, localeDateString } from '~/dates'
export default {
  async fetch () {
    const userId = this.$route.params.userId
    const url = `/api/dbtc/member/${userId}`
    const member = await this.$axios.$get(url)
    this.member = member
  },
  data () {
    return {
      member: undefined
    }
  },
  methods: {
    localeDateString,
    differenceToNow
  }
}
</script>
