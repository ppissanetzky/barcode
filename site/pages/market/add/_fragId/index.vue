<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-card v-if="frag" width="375px">
          <v-card-title>Add "{{ frag.name }}" to the market</v-card-title>
          <v-form ref="form" v-model="valid" :disabled="submitting">
            <v-card-text>
              <v-file-input
                v-if="pictureCount < 3"
                v-model="picture"
                outlined
                label="Add a picture"
                accept="image/*"
                prepend-icon=""
                hint="You can add up to 3 pictures"
                persistent-hint
                :rules="[pictureRequired]"
                @change="pictureChanged"
              />
              <v-sheet v-if="pictureCount" rounded outlined>
                <v-container fluid>
                  <v-row>
                    <v-col v-for="(p, index) in pictures" :key="index" cols="4">
                      <v-img
                        v-if="p.loading || p.src"
                        class="grey lighten-2"
                        aspect-ratio="1"
                        height="100px"
                        :src="p.src"
                      >
                        <v-container v-if="p.loading" fill-height>
                          <v-row justify="center" align="center">
                            <v-col cols="auto">
                              <v-progress-circular indeterminate />
                            </v-col>
                          </v-row>
                        </v-container>
                        <div v-else-if="p.src" class="text-right pa-0">
                          <v-btn icon :disabled="submitting" @click="removePicture(p)">
                            <v-icon color="white">
                              mdi-close-circle
                            </v-icon>
                          </v-btn>
                        </div>
                      </v-img>
                    </v-col>
                  </v-row>
                </v-container>
              </v-sheet>
            </v-card-text>
            <v-card-text>
              <v-text-field
                v-model="title"
                :rules="[required]"
                label="Title"
                outlined
              />
              <v-textarea
                v-model="description"
                :rules="[required]"
                label="Description"
                outlined
                rows="6"
              />
              <v-text-field
                v-model="price"
                :rules="[required, validPrice]"
                label="Price"
                prefix="$"
                outlined
              />
              <v-text-field
                v-model="location"
                :rules="[required]"
                label="Pickup location"
                outlined
              />
              <p>
                You acquired the mother colony on <strong>{{ motherDate }}</strong> ({{ motherAge }} ago).
                If this is incorrect, please edit the mother colony and come back.
              </p>
              <p>
                Below, enter the date this particular frag was cut or split from the mother colony. Both dates will be shown in the market.
              </p>
              <bc-date-picker
                v-model="dateCut"
                :rules="[required]"
                label="Date the frag was cut"
                persistent-hint
                hint="This is the date you cut this particular frag"
                outlined
              />
            </v-card-text>
          </v-form>
          <v-card-text>
            <v-btn
              color="primary"
              :disabled="!valid"
              :loading="submitting"
              @click="submit"
            >
              Submit
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import BcDatePicker from '~/components/BcDatePicker.vue'
import { localeDateString, differenceToNow, utcIsoStringFromString } from '~/dates'
export default {
  components: { BcDatePicker },
  async fetch () {
    const fragId = this.$route.params.fragId
    const { user, seller, frag, fragListings } = await this.$axios.$get(`/api/market/frag/${fragId}`)
    this.user = user
    // Can be undefined
    this.seller = seller
    this.frag = frag
    this.fragListings = fragListings
    // Populate initial values from the frag
    this.title = frag.name
    this.location = user.location
  },

  data: () => ({
    // Inputs we get from the server
    user: {},
    seller: undefined,
    frag: undefined,
    fragListings: [],
    // Stuff the user enters
    title: undefined,
    description: undefined,
    dateCut: undefined,
    price: undefined,
    location: undefined,
    picture: undefined,
    pictures: [
      { src: undefined, picture: undefined, loading: false, file: undefined },
      { src: undefined, picture: undefined, loading: false, file: undefined },
      { src: undefined, picture: undefined, loading: false, file: undefined }
    ],
    // Submitting
    submitting: false,
    valid: false
  }),

  computed: {
    motherDate () {
      return this.frag ? localeDateString(this.frag.dateAcquired) : undefined
    },
    motherAge () {
      return this.frag ? differenceToNow(this.frag.dateAcquired) : undefined
    },
    pictureCount () {
      return this.pictures.filter(({ file }) => file).length
    }
  },

  methods: {
    // Date functions
    localeDateString,
    differenceToNow,

    // Validation
    required (value) {
      if (!value) {
        return 'This field is required'
      }
      return true
    },
    beforeCutDate (value) {
      // TODO
      return true
    },
    validPrice (value) {
      if (!/^\d+$/.test(value)) {
        return 'The price must be a number with no decimals'
      }
      const price = parseInt(value, 10)
      if (isNaN(price) || price <= 0) {
        return 'That price looks goofy'
      }
      return true
    },
    pictureRequired () {
      if (!this.pictureCount) {
        return 'A picture is required'
      }
      return true
    },

    removePicture (p) {
      p.src = undefined
      p.file = undefined
      p.picture = undefined
      p.loading = false
      const pics = this.pictures
      pics.forEach((item, index) => {
        if (!item.file) {
          for (let i = index + 1; i < pics.length; ++i) {
            const other = pics[i]
            if (other.file) {
              item.src = other.src
              item.file = other.file
              item.picture = other.picture
              other.src = undefined
              other.file = undefined
              other.picture = undefined
              break
            }
          }
        }
      })
      this.$refs.form.validate()
    },

    async submit () {
      this.submitting = true
      try {
        const formData = new FormData()
        formData.set('title', this.title)
        formData.set('description', this.description)
        formData.set('cutTimestamp', utcIsoStringFromString(this.dateCut))
        formData.set('price', this.price)
        formData.set('pictures',
          this.pictures.filter(({ picture }) => picture)
            .map(({ picture }) => picture)
            .join(','))
        formData.set('location', this.location)
        const url = `/api/market/frag/${this.frag.fragId}`
        const { error } = await this.$axios.$post(url, formData)
        if (error) {
          console.error(error)
        }
      } finally {
        this.submitting = false
      }
    },

    pictureChanged (file) {
      console.log('PIC CHANGED', file)
      if (file) {
        const pics = this.pictures
        const gap = pics.find(({ file }) => !file)
        const exists = pics.some(other => other.file && other.file.name === file.name)
        if (gap && !exists) {
          gap.file = file
          gap.loading = true
          const formData = new FormData()
          formData.set('picture', file)
          this.$axios.$post('/api/market/picture', formData)
            .then(({ picture, src }) => {
              // If there is no src, something went wrong
              if (!src) {
                gap.file = undefined
              } else {
                gap.picture = picture
                gap.src = src
              }
            })
            .catch(() => {
              gap.file = undefined
            })
            .finally(() => {
              gap.loading = false
            })
        }
        this.$nextTick(() => {
          this.picture = undefined
        })
      }
    }
  }
}
</script>
